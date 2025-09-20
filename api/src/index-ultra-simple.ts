// Ultra-simple function - no imports, just basic response
export async function ultraSimple(_request: any, _context: any) {
    return {
        status: 200,
        body: JSON.stringify({
            message: 'Ultra simple function working!',
            timestamp: new Date().toISOString()
        })
    };
}

