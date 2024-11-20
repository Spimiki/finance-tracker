"use client";

import { useState } from "react";
import PnLGraph from './PnLGraph';

// Helius RPC endpoint (free tier)
const HELIUS_API_KEY = '207347a2-2161-4a15-9bf9-3945e80c8032'; // You should move this to environment variables
const RPC_ENDPOINT = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Add this helper function at the top
const parseMarketCap = (input) => {
  if (!input) return 0;
  
  // Convert input to string and remove spaces and dollar signs
  const cleanInput = input.toString().replace(/[\s$,]/g, '').toLowerCase();
  
  // Handle million notation
  if (cleanInput.endsWith('m')) {
    return parseFloat(cleanInput.slice(0, -1)) * 1000000;
  }
  
  // Handle billion notation
  if (cleanInput.endsWith('b')) {
    return parseFloat(cleanInput.slice(0, -1)) * 1000000000;
  }
  
  // Handle thousand notation
  if (cleanInput.endsWith('k')) {
    return parseFloat(cleanInput.slice(0, -1)) * 1000;
  }
  
  return parseFloat(cleanInput);
};

const TradesTracker = () => {
  const [trades, setTrades] = useState([]);
  const [newTrade, setNewTrade] = useState({
    tokenAddress: "",
    ticker: "",
    entryPrice: "",
    size: "",
    exitPrice: "",
    note: "",
    status: "open",
    marketCapAtEntry: "",
    marketCapAtEntryValue: "",
    exitMarketCap: "",
    solPrice: null,
    metadata: null,
  });
  const [closePositionModal, setClosePositionModal] = useState({
    isOpen: false,
    tradeId: null,
    exitMarketCap: "",
    exitMarketCapValue: null,
  });
  const [editingId, setEditingId] = useState(null);
  const [editingValues, setEditingValues] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    tradeId: null
  });

  const fetchTokenInfo = async (tokenAddress) => {
    try {
      // Basic Solana address format check
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenAddress)) {
        throw new Error('Invalid address format');
      }

      // Get token metadata from Helius
      const metadataResponse = await fetch(RPC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'my-id',
          method: 'getAsset',
          params: [tokenAddress],
        }),
      });
      
      const metadataData = await metadataResponse.json();
      
      // Get SOL price for USD conversion
      const solPriceResponse = await fetch('https://price.jup.ag/v4/price?ids=So11111111111111111111111111111111111111112');
      const solPriceData = await solPriceResponse.json();
      const solPrice = solPriceData.data['So11111111111111111111111111111111111111112']?.price;

      if (metadataData.result && metadataData.result.content) {
        // Extract token information from Helius response
        const tokenData = metadataData.result;
        const tokenContent = tokenData.content;
        
        setNewTrade(prev => ({
          ...prev,
          ticker: tokenContent.metadata?.symbol || tokenData.symbol || 'Unknown',
          tokenAddress: tokenAddress,
          entryPrice: '0',
          marketCapAtEntry: '0',
          solPrice: solPrice,
          metadata: {
            name: tokenContent.metadata?.name || tokenData.name || 'Unknown',
            symbol: tokenContent.metadata?.symbol || tokenData.symbol || 'Unknown',
            supply: tokenData.token_info?.supply || 0,
            tokenType: tokenData.token_info?.token_program || 'Unknown',
            decimals: tokenData.token_info?.decimals || 0,
          }
        }));
        return true;
      } else {
        // If no metadata found but address is valid
        const shortSymbol = `${tokenAddress.slice(0, 4)}...${tokenAddress.slice(-4)}`;
        setNewTrade(prev => ({
          ...prev,
          ticker: shortSymbol,
          tokenAddress: tokenAddress,
          entryPrice: '0',
          marketCapAtEntry: '0',
          solPrice: solPrice,
          metadata: {
            name: shortSymbol,
            symbol: shortSymbol,
            supply: 0,
            tokenType: 'Unknown',
            decimals: 0,
          }
        }));
        return true;
      }

    } catch (error) {
      console.warn('Error:', error.message);
      if (error.message === 'Invalid address format') {
        setNewTrade(prev => ({
          ...prev,
          ticker: 'Invalid address'
        }));
        return false;
      }
      // If it's any other error but the address format is valid
      const shortSymbol = `${tokenAddress.slice(0, 4)}...${tokenAddress.slice(-4)}`;
      setNewTrade(prev => ({
        ...prev,
        ticker: shortSymbol,
        tokenAddress: tokenAddress,
        entryPrice: '0',
        marketCapAtEntry: '0',
        metadata: {
          name: shortSymbol,
          symbol: shortSymbol,
          supply: 0,
          tokenType: 'Unknown',
          decimals: 0,
        }
      }));
      return true;
    }
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    
    if (name === 'marketCapAtEntry') {
      setNewTrade(prev => ({
        ...prev,
        marketCapAtEntry: value,
        marketCapAtEntryValue: parseMarketCap(value)
      }));
      return;
    }

    if (name === 'exitMarketCap') {
      setNewTrade(prev => ({
        ...prev,
        exitMarketCap: value,
        status: value ? 'closed' : 'open'
      }));
      return;
    }

    setNewTrade(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'tokenAddress') {
      if (value.length < 32) {
        setNewTrade(prev => ({
          ...prev,
          ticker: '',
          metadata: null
        }));
        return;
      }
      
      if (value.length >= 32) {
        await fetchTokenInfo(value.trim());
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!newTrade.tokenAddress || newTrade.ticker === 'Invalid address') {
      alert("Please enter a valid Solana token address");
      return;
    }

    if (!newTrade.size || newTrade.size <= 0) {
      alert("Please enter a valid position size");
      return;
    }

    if (!newTrade.marketCapAtEntry) {
      alert("Please enter entry market cap");
      return;
    }

    const parsedMarketCap = parseMarketCap(newTrade.marketCapAtEntry);
    const parsedExitMarketCap = newTrade.exitMarketCap ? parseMarketCap(newTrade.exitMarketCap) : null;

    setTrades((prev) => [
      ...prev,
      {
        ...newTrade,
        id: Date.now(),
        entryDate: new Date().toISOString(),
        marketCapAtEntryValue: parsedMarketCap,
        exitMarketCap: parsedExitMarketCap,
        status: parsedExitMarketCap ? 'closed' : 'open'
      },
    ]);

    resetNewTrade();
  };

  const openClosePositionModal = (tradeId) => {
    setClosePositionModal({
      isOpen: true,
      tradeId,
      exitMarketCap: "",
      exitMarketCapValue: null,
    });
  };

  const closePosition = () => {
    if (!closePositionModal.exitMarketCap) {
      alert("Please enter exit market cap");
      return;
    }

    const parsedExitMarketCap = parseMarketCap(closePositionModal.exitMarketCap);

    if (isNaN(parsedExitMarketCap) || parsedExitMarketCap <= 0) {
      alert("Please enter a valid exit market cap");
      return;
    }

    setTrades((prev) =>
      prev.map((trade) =>
        trade.id === closePositionModal.tradeId
            ? {
                ...trade,
                status: "closed",
                exitDate: new Date().toISOString(),
                exitMarketCap: parsedExitMarketCap,
                exitMarketCapDisplay: formatMarketCap(parsedExitMarketCap),
              }
            : trade
        )
    );

    setClosePositionModal({
      isOpen: false,
      tradeId: null,
      exitMarketCap: "",
      exitMarketCapValue: null,
    });
  };

  const fetchCurrentMarketData = async (trade) => {
    try {
      // Get current token price and market cap
      const priceResponse = await fetch(`https://price.jup.ag/v4/price?ids=${trade.tokenAddress}`);
      const priceData = await priceResponse.json();
      const currentPrice = priceData.data[trade.tokenAddress]?.price;

      // Get current SOL price
      const solPriceResponse = await fetch('https://price.jup.ag/v4/price?ids=So11111111111111111111111111111111111111112');
      const solPriceData = await solPriceResponse.json();
      const currentSolPrice = solPriceData.data['So11111111111111111111111111111111111111112']?.price;

      // Calculate current market cap
      const metadataResponse = await fetch('https://token.jup.ag/all');
      const tokens = await metadataResponse.json();
      const tokenInfo = tokens.find(token => token.address.toLowerCase() === trade.tokenAddress.toLowerCase());
      
      if (tokenInfo && currentPrice) {
        const supply = tokenInfo.supply / (10 ** tokenInfo.decimals);
        const currentMarketCap = supply * currentPrice;
        
        return {
          currentPrice,
          currentMarketCap,
          currentSolPrice
        };
      }
      return null;
    } catch (error) {
      console.warn('Error fetching current market data:', error);
      return null;
    }
  };

  const calculatePnL = (trade) => {
    if (trade.status === "closed" && trade.exitMarketCap) {
      const pnlPercentage = ((trade.exitMarketCap - trade.marketCapAtEntryValue) / trade.marketCapAtEntryValue) * 100;
      
      // Calculate USD P/L based on position size and market cap change
      const entryUSDSize = (trade.size * trade.solPrice) * (trade.marketCapAtEntryValue / trade.marketCapAtEntryValue);
      const exitUSDSize = (trade.size * trade.solPrice) * (trade.exitMarketCap / trade.marketCapAtEntryValue);
      const pnlUSD = exitUSDSize - entryUSDSize;
      
      return {
        pnlPercentage,
        pnlUSD,
        isLoaded: true
      };
    }
    return {
      pnlPercentage: 0,
      pnlUSD: 0,
      isLoaded: false
    };
  };

  const handleDelete = (tradeId) => {
    setDeleteModal({
      isOpen: true,
      tradeId
    });
  };

  const confirmDelete = () => {
    setTrades(prev => prev.filter(trade => trade.id !== deleteModal.tradeId));
    setDeleteModal({
      isOpen: false,
      tradeId: null
    });
  };

  const startEditing = (trade) => {
    setEditingId(trade.id);
    setEditingValues({
      marketCapAtEntry: trade.marketCapAtEntryValue ? formatMarketCap(trade.marketCapAtEntryValue) : '',
      exitMarketCap: trade.exitMarketCap ? formatMarketCap(trade.exitMarketCap) : '',
      note: trade.note || '',
      size: trade.size || ''
    });
  };

  const handleEditChange = (e, field) => {
    const { value } = e.target;
    setEditingValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveEdit = (tradeId) => {
    const parsedMarketCap = parseMarketCap(editingValues.marketCapAtEntry);
    const parsedExitMarketCap = editingValues.exitMarketCap ? parseMarketCap(editingValues.exitMarketCap) : null;
    const parsedSize = parseFloat(editingValues.size);

    if (!parsedMarketCap || parsedMarketCap <= 0) {
      alert("Please enter a valid entry market cap");
      return;
    }

    if (!parsedSize || parsedSize <= 0) {
      alert("Please enter a valid size");
      return;
    }

    setTrades(prev => prev.map(trade => {
      if (trade.id === tradeId) {
        return {
          ...trade,
          marketCapAtEntryValue: parsedMarketCap,
          exitMarketCap: parsedExitMarketCap,
          status: parsedExitMarketCap ? 'closed' : 'open',
          note: editingValues.note,
          size: parsedSize,
          exitDate: parsedExitMarketCap ? new Date().toISOString() : null
        };
      }
      return trade;
    }));
    
    setEditingId(null);
    setEditingValues(null);
  };

  const formatMarketCap = (value) => {
    if (!value) return '';
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(2) + 'b';
    }
    if (value >= 1000000) {
      return (value / 1000000).toFixed(2) + 'm';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(2) + 'k';
    }
    return value.toString();
  };

  const resetNewTrade = () => {
    setNewTrade({
      tokenAddress: "",
      ticker: "",
      entryPrice: "",
      size: "",
      exitPrice: "",
      note: "",
      status: "open",
      marketCapAtEntry: "",
      marketCapAtEntryValue: "",
      exitMarketCap: "",
      solPrice: null,
      metadata: null,
    });
  };

  const formatLargeNumber = (num) => {
    if (!num || isNaN(num)) return '0';
    
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const closedTrades = trades.filter(t => t.status === 'closed');
  const totalPnL = closedTrades.reduce((sum, trade) => {
    const pnlValue = trade.exitMarketCap - trade.marketCapAtEntryValue;
    const pnlUSD = pnlValue * (trade.size * trade.solPrice / trade.marketCapAtEntryValue);
    return sum + pnlUSD;
  }, 0);

  const winningTrades = closedTrades.filter(trade => {
    const pnlValue = trade.exitMarketCap - trade.marketCapAtEntryValue;
    return pnlValue > 0;
  });

  const winRate = closedTrades.length > 0 
    ? ((winningTrades.length / closedTrades.length) * 100).toFixed(1)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Close Position Modal */}
      {closePositionModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Close Position
            </h3>
            <input
              type="text"
              placeholder="Exit Market Cap (e.g., 1.5m, 150k)"
              value={closePositionModal.exitMarketCap}
              onChange={(e) =>
                setClosePositionModal((prev) => ({
                  ...prev,
                  exitMarketCap: e.target.value,
                }))
              }
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() =>
                  setClosePositionModal({
                    isOpen: false,
                    tradeId: null,
                    exitMarketCap: "",
                    exitMarketCapValue: null,
                  })
                }
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={closePosition}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Delete Trade
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to delete this trade? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, tradeId: null })}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* P/L Graph */}
        <div className="col-span-1">
          <PnLGraph trades={trades} />
        </div>

        {/* Summary Stats */}
        <div className="col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Trading Summary
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Trades</p>
              <p className="text-2xl font-semibold">
                {trades.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Open Positions</p>
              <p className="text-2xl font-semibold">
                {trades.filter(t => t.status === 'open').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total P/L</p>
              <p className={`text-2xl font-semibold ${
                totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${formatLargeNumber(totalPnL)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Win Rate</p>
              <p className="text-2xl font-semibold">
                {winRate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Trade Tracker
          </h2>
        </div>

        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="relative">
                <input
                  type="text"
                  name="tokenAddress"
                  placeholder="Token Address"
                  value={newTrade.tokenAddress}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {newTrade.ticker && newTrade.metadata && (
                  <div className="absolute right-3 top-2 text-sm text-gray-500 dark:text-gray-400">
                    {newTrade.ticker}
                    <span className="ml-2 text-xs">
                      MC: ${Number(newTrade.metadata.marketCap).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="relative">
                <input
                  type="number"
                  name="size"
                  placeholder="Position Size (SOL)"
                  value={newTrade.size}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {newTrade.size && newTrade.solPrice && (
                  <div className="absolute right-3 top-2 text-xs text-gray-500 dark:text-gray-400">
                    ${(newTrade.size * newTrade.solPrice).toFixed(2)}
                  </div>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  name="marketCapAtEntry"
                  placeholder="Entry Market Cap (e.g., 1.5m)"
                  value={newTrade.marketCapAtEntry}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                />
              </div>

              <div className="relative">
                <input
                  type="text"
                  name="exitMarketCap"
                  placeholder="Exit Market Cap (optional)"
                  value={newTrade.exitMarketCap}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                />
              </div>

              <input
                type="text"
                name="note"
                placeholder="Note (optional)"
                value={newTrade.note}
                onChange={handleInputChange}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />

              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Trade
              </button>
            </div>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Entry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ticker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Entry MC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Exit MC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Size (SOL)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Size (USD)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Note
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  P&L
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {trades.map((trade) => {
                const isEditing = editingId === trade.id;
                const pnlData = calculatePnL(trade);
                const hasValidPnL = trade.status === "closed" && 
                  trade.exitMarketCap && 
                  trade.marketCapAtEntryValue && 
                  !isNaN(trade.exitMarketCap) && 
                  !isNaN(trade.marketCapAtEntryValue);

                const pnlPercentage = hasValidPnL ? 
                  ((trade.exitMarketCap - trade.marketCapAtEntryValue) / trade.marketCapAtEntryValue) * 100 : 
                  null;

                const pnlValue = hasValidPnL ? 
                  trade.exitMarketCap - trade.marketCapAtEntryValue : 
                  null;

                return (
                  <tr key={trade.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {new Date(trade.entryDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {trade.ticker}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingValues.marketCapAtEntry}
                          onChange={(e) => handleEditChange(e, 'marketCapAtEntry')}
                          className="w-24 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                        />
                      ) : (
                        `$${formatLargeNumber(trade.marketCapAtEntryValue)}`
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingValues.exitMarketCap}
                          onChange={(e) => handleEditChange(e, 'exitMarketCap')}
                          className="w-24 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                        />
                      ) : (
                        trade.status === "closed" ? `$${formatLargeNumber(trade.exitMarketCap)}` : "-"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editingValues.size}
                          onChange={(e) => handleEditChange(e, 'size')}
                          className="w-20 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                        />
                      ) : (
                        `${trade.size} SOL`
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      ${((trade.size || 0) * (trade.solPrice || 0)).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingValues.note}
                          onChange={(e) => handleEditChange(e, 'note')}
                          className="w-32 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                        />
                      ) : (
                        trade.note
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`${
                          trade.status === "open"
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {trade.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {hasValidPnL ? (
                        <div>
                          <span
                            className={
                              pnlValue >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }
                          >
                            {pnlPercentage.toFixed(2)}%
                            <br />
                            ${formatLargeNumber(pnlValue * (trade.size * trade.solPrice / trade.marketCapAtEntryValue))}
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-3">
                        {isEditing ? (
                          <>
                            <button
                              className="text-green-600 hover:text-green-800"
                              onClick={() => saveEdit(trade.id)}
                            >
                              Save
                            </button>
                            <button
                              className="text-gray-600 hover:text-gray-800"
                              onClick={() => {
                                setEditingId(null);
                                setEditingValues(null);
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => startEditing(trade)}
                            >
                              Edit
                            </button>
                            {trade.status === "open" && (
                              <button
                                className="text-green-600 hover:text-green-800"
                                onClick={() => openClosePositionModal(trade.id)}
                              >
                                Close
                              </button>
                            )}
                            <button
                              className="text-red-600 hover:text-red-800"
                              onClick={() => handleDelete(trade.id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TradesTracker;
