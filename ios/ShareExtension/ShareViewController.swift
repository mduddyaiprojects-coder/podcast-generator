import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: SLComposeServiceViewController {
    
    // MARK: - Properties
    private let apiBaseURL = "https://podcast-gen-api.azurewebsites.net/api"
    private let shareExtensionGroupID = "group.com.podcastgenerator.share"
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        processSharedContent()
    }
    
    // MARK: - UI Setup
    private func setupUI() {
        // Set placeholder text
        placeholder = "Add a note about this content (optional)"
        
        // Configure navigation bar
        navigationController?.navigationBar.tintColor = UIColor.systemBlue
        navigationController?.navigationBar.titleTextAttributes = [
            .foregroundColor: UIColor.label
        ]
    }
    
    // MARK: - Content Processing
    private func processSharedContent() {
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem else {
            showError("No content to share")
            return
        }
        
        // Process different types of content
        if let attachments = extensionItem.attachments {
            for attachment in attachments {
                processAttachment(attachment)
            }
        }
    }
    
    private func processAttachment(_ attachment: NSItemProvider) {
        // Handle URLs
        if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
            attachment.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] (item, error) in
                DispatchQueue.main.async {
                    if let url = item as? URL {
                        self?.handleURL(url)
                    } else if let error = error {
                        self?.showError("Failed to load URL: \(error.localizedDescription)")
                    }
                }
            }
        }
        // Handle text
        else if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
            attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] (item, error) in
                DispatchQueue.main.async {
                    if let text = item as? String {
                        self?.handleText(text)
                    } else if let error = error {
                        self?.showError("Failed to load text: \(error.localizedDescription)")
                    }
                }
            }
        }
        // Handle images
        else if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
            attachment.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { [weak self] (item, error) in
                DispatchQueue.main.async {
                    if let image = item as? UIImage {
                        self?.handleImage(image)
                    } else if let url = item as? URL {
                        self?.handleImageURL(url)
                    } else if let error = error {
                        self?.showError("Failed to load image: \(error.localizedDescription)")
                    }
                }
            }
        }
        // Handle files
        else if attachment.hasItemConformingToTypeIdentifier(UTType.data.identifier) {
            attachment.loadItem(forTypeIdentifier: UTType.data.identifier, options: nil) { [weak self] (item, error) in
                DispatchQueue.main.async {
                    if let url = item as? URL {
                        self?.handleFile(url)
                    } else if let error = error {
                        self?.showError("Failed to load file: \(error.localizedDescription)")
                    }
                }
            }
        }
    }
    
    // MARK: - Content Handlers
    private func handleURL(_ url: URL) {
        let content = ContentSubmission(
            content_url: url.absoluteString,
            title: extractTitle(from: url),
            description: textView.text,
            content_type: "url"
        )
        submitContent(content)
    }
    
    private func handleText(_ text: String) {
        let content = ContentSubmission(
            content_url: "text://\(UUID().uuidString)",
            title: "Text Content",
            description: text,
            content_type: "document"
        )
        submitContent(content)
    }
    
    private func handleImage(_ image: UIImage) {
        // Convert image to data and upload
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            showError("Failed to process image")
            return
        }
        
        uploadImageData(imageData) { [weak self] imageURL in
            guard let imageURL = imageURL else {
                self?.showError("Failed to upload image")
                return
            }
            
            let content = ContentSubmission(
                content_url: imageURL,
                title: "Image Content",
                description: self?.textView.text,
                content_type: "document"
            )
            self?.submitContent(content)
        }
    }
    
    private func handleImageURL(_ url: URL) {
        let content = ContentSubmission(
            content_url: url.absoluteString,
            title: "Image Content",
            description: textView.text,
            content_type: "document"
        )
        submitContent(content)
    }
    
    private func handleFile(_ url: URL) {
        let content = ContentSubmission(
            content_url: url.absoluteString,
            title: url.lastPathComponent,
            description: textView.text,
            content_type: "document"
        )
        submitContent(content)
    }
    
    // MARK: - API Communication
    private func submitContent(_ content: ContentSubmission) {
        showLoadingIndicator(true)
        
        guard let url = URL(string: "\(apiBaseURL)/content") else {
            showError("Invalid API URL")
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            let jsonData = try JSONEncoder().encode(content)
            request.httpBody = jsonData
            
            URLSession.shared.dataTask(with: request) { [weak self] (data, response, error) in
                DispatchQueue.main.async {
                    self?.showLoadingIndicator(false)
                    
                    if let error = error {
                        self?.showError("Network error: \(error.localizedDescription)")
                        return
                    }
                    
                    guard let httpResponse = response as? HTTPURLResponse else {
                        self?.showError("Invalid response")
                        return
                    }
                    
                    if httpResponse.statusCode == 200 || httpResponse.statusCode == 201 {
                        self?.showSuccess("Content submitted successfully!")
                        self?.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
                    } else {
                        self?.showError("Server error: \(httpResponse.statusCode)")
                    }
                }
            }.resume()
            
        } catch {
            showLoadingIndicator(false)
            showError("Failed to encode content: \(error.localizedDescription)")
        }
    }
    
    private func uploadImageData(_ data: Data, completion: @escaping (String?) -> Void) {
        // This would typically upload to your storage service
        // For now, we'll simulate a successful upload
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            completion("https://example.com/uploaded-image.jpg")
        }
    }
    
    // MARK: - Helper Methods
    private func extractTitle(from url: URL) -> String {
        // Extract title from URL or use hostname
        return url.host ?? "Shared Content"
    }
    
    private func showLoadingIndicator(_ show: Bool) {
        // Show/hide loading indicator
        if show {
            // Implement loading UI
        } else {
            // Hide loading UI
        }
    }
    
    private func showError(_ message: String) {
        let alert = UIAlertController(title: "Error", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak self] _ in
            self?.extensionContext?.cancelRequest(withError: NSError(domain: "ShareExtension", code: -1, userInfo: [NSLocalizedDescriptionKey: message]))
        })
        present(alert, animated: true)
    }
    
    private func showSuccess(_ message: String) {
        let alert = UIAlertController(title: "Success", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak self] _ in
            self?.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        })
        present(alert, animated: true)
    }
}

// MARK: - Content Models
struct ContentSubmission: Codable {
    let content_url: String?
    let title: String
    let description: String?
    let content_type: String
}

enum ContentType: String, Codable {
    case url = "url"
    case text = "text"
    case image = "image"
    case file = "file"
}

