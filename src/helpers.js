// https://cloud.iexapis.com/stable/stock/twtr/chart/1y?token=pk_85ec59ee38fe474e84c13e81689fc475

export function makeApiRequest(path) {
    try {
        const response = fetch(`https://cloud.iexapis.com/stable/${path}`)
            .then(response => {
                return response.json();
            });
    } catch (error) {
        throw new Error(`IEX Cloud request error: ${error.status}`);
    }
}

export function parseFullSymbol(fullSymbol) {
    const match = fullSymbol.match(/^(\w+):(\w+)\/(\w+)$/);
    if (!match) {
        return null;
    }

    return { exchange: match[1], fromSymbol: match[2], toSymbol: match[3] };
}