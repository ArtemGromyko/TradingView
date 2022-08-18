const configurationData = {
    supported_resolutions: ['1D', '1W', '1M'],
    exchanges: [],
    supports_marks: true,
    supports_timescale_marks: true,
    enabled_features: [
        'create_volume_indicator_by_default'
        ],
    symbols_types: [
        {
            name: 'crypto',

            // `symbolType` argument for the `searchSymbols` method, if a user selects this symbol type
            value: 'crypto',
        },
        {
            name: 'custom',

            // `symbolType` argument for the `searchSymbols` method, if a user selects this symbol type
            value: 'custom',
        },

    ]
};

async function getAllSymbols() {

    var data = await makeApiRequest('ref-data/symbols?token=Tpk_8d61db719bdf42e78dc4383ba340b011');

    let allSymbols = [];

    for (const symbolObject of data) {
        allSymbols = allSymbols.concat({
            symbol: symbolObject.symbol,
            full_name: symbolObject.symbol,
            description: symbolObject.name,
            exchange: symbolObject.exchange,
            type: 'crypto'
        });
    }

    return allSymbols;

    //makeApiRequest('ref-data/symbols?token=pk_85ec59ee38fe474e84c13e81689fc475')
    //    .then((data) => {
    //        let allSymbols = [];


    //        for (const symbolObject of data.Data) {
    //            allSymbols = allSymbols.concat({
    //                symbol: symbolObject.symbol,
    //                full_name: symbolObject.name,
    //                description: symbolObject.name,
    //                exchange: symbolObject.exchange,
    //                type: 'crypto'
    //            });
    //        }

    //        return allSymbols;
    //    });
}

async function makeApiRequest(path) {
    var data;
    await timeout(50);
    data = await fetch(`https://sandbox.iexapis.com/stable/${path}`);
    return data.json();
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function dateToTicks(date) {
    const epochOffset = 621355968000000000;
    const ticksPerMillisecond = 10000;

    const ticks = new Date(date).getTime() * ticksPerMillisecond + epochOffset;

    return ticks;
}


function parseFullSymbol(fullSymbol) {
    const match = fullSymbol.match(/^(\w+):(\w+)\/(\w+)$/);
    if (!match) {
        return null;
    }

    return { exchange: match[1], fromSymbol: match[2], toSymbol: match[3] };
}

export const Datafeed = {
    onReady: (callback) => {
        console.log('[onReady]: Method call');

        makeApiRequest(`/ref-data/exchanges?token=Tpk_8d61db719bdf42e78dc4383ba340b011`)
            .then(exchanges => {
                configurationData.exchanges = exchanges.map((exchange) => ({
                    value: exchange.exchange,
                    name: exchange.exchange,
                    desc: exchange.description
                }));
            }).then(() => setTimeout(() => callback(configurationData)));
    },

    searchSymbols: (userInput, exchange, symbolType, onResultReadyCallback) => {
        console.log('[searchSymbols]: Method call');
        const symbols = getAllSymbols().then((symbols) => {
            const newSymbols = symbols.filter(symbol => {
                const isExchangeValid = exchange === '' || symbol.exchange === exchange;
                const isFullSymbolContainsInput = symbol.full_name
                    .toLowerCase()
                    .indexOf(userInput.toLowerCase()) !== -1;
                return isExchangeValid && isFullSymbolContainsInput;
            });
            onResultReadyCallback(newSymbols);
        });
    },

    resolveSymbol: (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
        console.log('[resolveSymbol]: Method call', symbolName);
        getAllSymbols()
            .then((symbols) => {
                const symbolItem = symbols.find(({ full_name }) => full_name === symbolName);

                if (!symbolItem) {
                    console.log('[resolveSymbol]: Cannot resolve symbol', symbolName);
                    onResolveErrorCallback('cannot resolve symbol');
                    return;
                }
                const symbolInfo = {
                    ticker: symbolItem.full_name,
                    name: symbolItem.symbol,
                    description: symbolItem.description,
                    type: symbolItem.type,
                    session: '24x7',
                    timezone: 'Etc/UTC',
                    exchange: symbolItem.exchange,
                    minmov: 1,
                    pricescale: 100,
                    has_intraday: false,
                    has_no_volume: false,
                    has_weekly_and_monthly: false,
                    supported_resolutions: configurationData.supported_resolutions,
                    volume_precision: 2,
                    data_status: 'streaming',
                };

                console.log('[resolveSymbol]: Symbol resolved', symbolName);
                onSymbolResolvedCallback(symbolInfo);
            });

    },

    getBars: (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
        console.log('[getBars]: Method call', symbolInfo);
        const { from, to, firstDataRequest } = periodParams;

        console.log('[getBars]: Method call', symbolInfo, resolution, from, to, firstDataRequest);
        var currectTime = new Date().getTime();
        var needToLoadCurrentPrice = currectTime >= from * 1000 && currectTime < to * 1000;

        try {

            makeApiRequest(`stock/${symbolInfo.name}/chart/max/?token=Tpk_8d61db719bdf42e78dc4383ba340b011`)
                .then((data) => {
                    if (data.Response && data.Response === 'Error' || data.length === 0) {
                        // "noData" should be set if there is no data in the requested period.
                        onHistoryCallback([], { noData: true });
                        return;
                    }
                    let bars = [];
                    data.forEach(bar => {
                        if (new Date(bar.date).getTime() >= from * 1000 && new Date(bar.date).getTime() < to * 1000) {
                            bars = [...bars, {
                                time: new Date(bar.date).getTime(),
                                low: bar.low,
                                high: bar.high,
                                open: bar.open,
                                close: bar.close,
                                volume: bar.volume
                            }];
                        }
                    });

                    console.log(`[getBars]: returned ${bars.length} bar(s)`);
                    console.log(bars);
                    onHistoryCallback(bars, { noData: false });
                });
        } catch (error) {
            console.log('[getBars]: Get error', error);
            onErrorCallback(error);
        }
    },
    getMarks: (symbolInfo, from, to, onDataCallback, resolution) => {
        var currectTime = new Date().getTime();
        var needToLoadCurrentPrice = currectTime >= from * 1000 && currectTime < to * 1000;
        if (needToLoadCurrentPrice) {
            console.log('[getMarks]: Method call', symbolInfo);
            makeApiRequest(`/time-series/advanced_dividends/${symbolInfo.name}?token=Tpk_8d61db719bdf42e78dc4383ba340b011`)
                .then((data) => {
                    var marks = [];
                    data.map(dataItem => {
                        marks.push({
                            id: dataItem.id,
                            time: new Date(dataItem.date).getTime(),
                            color: 'FF00FF',
                            text: dataItem.description,
                            label: 'D',
                            labelFontColor: '00FF00',
                            minSize: 10
                        })
                    })

                    onDataCallback(marks);
                })
                .catch((error) => {
                    console.log(`UdfCompatibleDatafeed: Request marks failed: ${error}`);
                    onDataCallback([]);
                });
        }
    },
    getTimescaleMarks: (symbolInfo, from, to, onDataCallback, resolution) => {

        var currectTime = new Date().getTime();
        var needToLoadCurrentPrice = currectTime >= from * 1000 && currectTime < to * 1000;
        if (needToLoadCurrentPrice) {
            console.log('[getTimescaleMarks]: Method call', symbolInfo, from, to, onDataCallback, resolution);
            makeApiRequest(`/stock/${symbolInfo.name}/dividends?token=Tpk_8d61db719bdf42e78dc4383ba340b011`)
                .then((data) => {
                    var marks = [];
                    data.map(dataItem => {
                        marks.push({
                            id: dataItem.id,
                            time: new Date(dataItem.date).getTime(),
                            color: 'FF00FF',
                            text: dataItem.description,
                            label: 'D',
                            tooltip: dataItem.description
                        })
                    })

                    onDataCallback(marks);
                })
                .catch((error) => {
                    console.log(`UdfCompatibleDatafeed: Request marks failed: ${error}`);
                    onDataCallback([]);
                });
        }
       
    },
    subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscribeUID, onResetCacheNeededCallback) => {
        console.log('[subscribeBars]: Method call with subscribeUID:', subscribeUID);
    },
    unsubscribeBars: (subscriberUID) => {
        console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID);
    }
};

