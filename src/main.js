import { Datafeed } from './datafeed.js';
window.tvWidget = new TradingView.widget({
    symbol: 'AAPL', // default symbol
    interval: '24M', // default interval
    period: '24M',
    fullscreen: true, // displays the chart in the fullscreen mode
    container: 'tv_chart_container',
    datafeed: Datafeed,
    library_path: '../charting_library_clonned_data/charting_library/',
});