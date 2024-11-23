"use client";

import { useState, useEffect } from "react";
import PnLGraph from './PnLGraph';
import Switch from '@/components/ui/Switch';
import ValidationModal from '@/components/ui/ValidationModal';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase/config';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import AuthModal from '@/components/AuthModal';
import { useRouter } from 'next/navigation';
import { RPC_ENDPOINT } from '@/constants/api';

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

// Add test data with more diverse scenarios
const TEST_TRADES = [
  {
    id: 'test1',
    tokenName: 'BONK',
    ticker: 'BONK',
    status: 'closed',
    size: 10,
    solPrice: 98,
    marketCapAtEntryValue: 150000,
    exitMarketCap: 450000,
    exitDate: '2024-03-01',
    entryDate: '2024-02-01',
    note: '3x on meme coin'
  },
  {
    id: 'test2',
    tokenName: 'JUP',
    ticker: 'JUP',
    status: 'closed',
    size: 5,
    solPrice: 95,
    marketCapAtEntryValue: 200000,
    exitMarketCap: 180000,
    exitDate: '2024-03-15',
    entryDate: '2024-02-15',
    note: 'Small loss on dip'
  },
  {
    id: 'test3',
    tokenName: 'PYTH',
    ticker: 'PYTH',
    status: 'open',
    size: 7.5,
    solPrice: 105,
    marketCapAtEntryValue: 150000,
    entryDate: '2024-03-01',
    note: 'Oracle narrative'
  },
  {
    id: 'test4',
    tokenName: 'ORCA',
    ticker: 'ORCA',
    status: 'closed',
    size: 2.5,
    solPrice: 98,
    marketCapAtEntryValue: 80000,
    exitMarketCap: 240000,
    exitDate: '2024-03-20',
    entryDate: '2024-02-20',
    note: 'DeFi momentum'
  },
  {
    id: 'test5',
    tokenName: 'MEAN',
    ticker: 'MEAN',
    status: 'open',
    size: 3,
    solPrice: 102,
    marketCapAtEntryValue: 30000,
    entryDate: '2024-03-10',
    note: 'Micro cap play'
  },
  {
    id: 'test6',
    tokenName: 'RENDER',
    ticker: 'RNDR',
    status: 'closed',
    size: 1.5,
    solPrice: 97,
    marketCapAtEntryValue: 500000,
    exitMarketCap: 400000,
    exitDate: '2024-03-25',
    entryDate: '2024-03-05',
    note: 'AI token pullback'
  },
  {
    id: 'test7',
    tokenName: 'GECKO',
    ticker: 'GECKO',
    status: 'closed',
    size: 4.2,
    solPrice: 100,
    marketCapAtEntryValue: 45000,
    exitMarketCap: 15000,
    exitDate: '2024-03-28',
    entryDate: '2024-03-15',
    note: 'Stopped out'
  },
  {
    id: 'test8',
    tokenName: 'DUAL',
    ticker: 'DUAL',
    status: 'open',
    size: 6.8,
    solPrice: 103,
    marketCapAtEntryValue: 125000,
    entryDate: '2024-03-22',
    note: 'Options protocol'
  },
  {
    id: 'test9',
    tokenName: 'PRISM',
    ticker: 'PRISM',
    status: 'closed',
    size: 8.3,
    solPrice: 99,
    marketCapAtEntryValue: 75000,
    exitMarketCap: 225000,
    exitDate: '2024-03-18',
    entryDate: '2024-02-28',
    note: 'NFT marketplace pump'
  },
  {
    id: 'test10',
    tokenName: 'RATIO',
    ticker: 'RATIO',
    status: 'open',
    size: 5.5,
    solPrice: 101,
    marketCapAtEntryValue: 95000,
    entryDate: '2024-03-25',
    note: 'DeFi lending play'
  }
];

// Add this SVG component near the top of the file
const RefreshIcon = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 2v6h-6"></path>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
    <path d="M3 22v-6h6"></path>
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
  </svg>
);

// Add these helper functions at the component level
const calculateStatistics = (trades, unrealizedPnLData) => {
  const closedTrades = trades.filter(t => t.status === 'closed');
  const openTrades = trades.filter(t => t.status === 'open');

  // Calculate realized P&L
  const totalRealizedPnL = closedTrades.reduce((sum, trade) => {
    const pnlValue = trade.exitMarketCap - trade.marketCapAtEntryValue;
    const pnlUSD = pnlValue * (trade.size * trade.solPrice / trade.marketCapAtEntryValue);
    return sum + pnlUSD;
  }, 0);

  // Calculate unrealized P&L
  const totalUnrealizedPnL = openTrades.reduce((sum, trade) => {
    if (unrealizedPnLData[trade.id]) {
      return sum + unrealizedPnLData[trade.id].pnlUSD;
    }
    return sum;
  }, 0);

  const totalPnL = totalRealizedPnL + totalUnrealizedPnL;

  const winningTrades = closedTrades.filter(trade => {
    const pnlValue = trade.exitMarketCap - trade.marketCapAtEntryValue;
    return pnlValue > 0;
  });

  const winRate = closedTrades.length > 0 
    ? ((winningTrades.length / closedTrades.length) * 100).toFixed(1)
    : 0;

  return {
    totalTrades: trades.length,
    openPositions: openTrades.length,
    totalRealizedPnL,
    totalUnrealizedPnL,
    totalPnL,
    winRate
  };
};

// Add at the top of the file, after imports
const API_DELAY = 1000; // 1 second delay between API calls
let lastApiCall = 0;

// Add this helper function
const delayApiCall = async () => {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  if (timeSinceLastCall < API_DELAY) {
    await new Promise(resolve => setTimeout(resolve, API_DELAY - timeSinceLastCall));
  }
  lastApiCall = Date.now();
};

const TradesTracker = () => {
  const [trades, setTrades] = useState([]);
  const [modifiedTestTrades, setModifiedTestTrades] = useState(TEST_TRADES);
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
    currentMarketCap: null,
    isLoadingCurrentMC: false
  });
  const [editingId, setEditingId] = useState(null);
  const [editingValues, setEditingValues] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    tradeId: null
  });
  const [isTestMode, setIsTestMode] = useState(true);
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    message: ''
  });
  const [unrealizedPnL, setUnrealizedPnL] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statistics, setStatistics] = useState({
    totalTrades: 0,
    openPositions: 0,
    totalRealizedPnL: 0,
    totalUnrealizedPnL: 0,
    totalPnL: 0,
    winRate: 0
  });
  const [authModal, setAuthModal] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  
  // Update displayedTrades to use modifiedTestTrades
  const displayedTrades = isTestMode ? modifiedTestTrades : trades;

  const fetchTokenInfo = async (tokenAddress) => {
    try {
      // Basic Solana address format check
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenAddress)) {
        throw new Error('Invalid address format');
      }

      // Get SOL price from Helius
      const solPriceResponse = await fetch(RPC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'my-id',
          method: 'getAsset',
          params: ['So11111111111111111111111111111111111111112'], // SOL mint address
        }),
      });
      
      const solPriceData = await solPriceResponse.json();
      const solPrice = solPriceData.result?.token_info?.price_info?.price_per_token || 0;

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

      if (metadataData.result && metadataData.result.content) {
        const tokenData = metadataData.result;
        const tokenContent = tokenData.content;
        
        setNewTrade(prev => ({
          ...prev,
          ticker: tokenContent.metadata?.symbol || tokenData.symbol || 'Unknown',
          tokenAddress: tokenAddress,
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
        const shortSymbol = `${tokenAddress.slice(0, 4)}...${tokenAddress.slice(-4)}`;
        setNewTrade(prev => ({
          ...prev,
          ticker: shortSymbol,
          tokenAddress: tokenAddress,
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
      return false;
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

    // Handle manual ticker input when no address is present
    if (name === 'ticker' && !newTrade.tokenAddress) {
      setNewTrade(prev => ({
        ...prev,
        ticker: value.toUpperCase()
      }));
      return;
    }

    // Handle token address input
    if (name === 'tokenAddress') {
      if (!value) {
        // Reset metadata but keep other fields if address is cleared
        setNewTrade(prev => ({
          ...prev,
          tokenAddress: '',
          metadata: null
        }));
        return;
      }
      
      if (value.length >= 32) {
        await fetchTokenInfo(value.trim());
      } else {
        setNewTrade(prev => ({
          ...prev,
          tokenAddress: value
        }));
      }
      return;
    }

    setNewTrade(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user && !isTestMode) {
      setAuthModal(true);
      return;
    }

    if (!newTrade.ticker) {
      setValidationModal({
        isOpen: true,
        message: "Please enter a ticker symbol"
      });
      return;
    }

    if (!newTrade.size || newTrade.size <= 0) {
      setValidationModal({
        isOpen: true,
        message: "Please enter a valid position size"
      });
      return;
    }

    if (!newTrade.marketCapAtEntry) {
      setValidationModal({
        isOpen: true,
        message: "Please enter entry market cap"
      });
      return;
    }

    const parsedMarketCap = parseMarketCap(newTrade.marketCapAtEntry);
    const parsedExitMarketCap = newTrade.exitMarketCap ? parseMarketCap(newTrade.exitMarketCap) : null;

    const newTradeData = {
      ...newTrade,
      userId: user?.uid,
      entryDate: new Date().toISOString(),
      marketCapAtEntryValue: parsedMarketCap,
      exitMarketCap: parsedExitMarketCap,
      status: parsedExitMarketCap ? 'closed' : 'open',
      solPrice: newTrade.solPrice || null,
      tokenName: newTrade.ticker
    };

    if (isTestMode) {
      setModifiedTestTrades(prev => [...prev, { ...newTradeData, id: `test${Date.now()}` }]);
    } else {
      try {
        await addDoc(collection(db, "trades"), newTradeData);
      } catch (error) {
        console.error("Error adding trade:", error);
        setValidationModal({
          isOpen: true,
          message: "Error saving trade. Please try again."
        });
        return;
      }
    }

    resetNewTrade();
  };

  const openClosePositionModal = async (tradeId) => {
    setClosePositionModal({
      isOpen: true,
      tradeId,
      exitMarketCap: "",
      exitMarketCapValue: null,
      currentMarketCap: null,
      isLoadingCurrentMC: true
    });

    const trade = displayedTrades.find(t => t.id === tradeId);
    if (trade?.tokenAddress) {
      const currentData = await fetchCurrentMarketData(trade.tokenAddress);
      if (currentData) {
        setClosePositionModal(prev => ({
          ...prev,
          currentMarketCap: currentData.currentMarketCap,
          isLoadingCurrentMC: false
        }));
      } else {
        setClosePositionModal(prev => ({
          ...prev,
          isLoadingCurrentMC: false
        }));
      }
    } else {
      setClosePositionModal(prev => ({
        ...prev,
        isLoadingCurrentMC: false
      }));
    }
  };

  const closeAtCurrentMC = () => {
    if (!closePositionModal.currentMarketCap) {
      setValidationModal({
        isOpen: true,
        message: "Current market cap data not available"
      });
      return;
    }

    if (isTestMode) {
      setModifiedTestTrades(prev =>
        prev.map((trade) =>
          trade.id === closePositionModal.tradeId
            ? {
                ...trade,
                status: "closed",
                exitDate: new Date().toISOString(),
                exitMarketCap: closePositionModal.currentMarketCap,
                exitMarketCapDisplay: formatMarketCap(closePositionModal.currentMarketCap),
              }
            : trade
        )
      );
    } else {
      setTrades(prev =>
        prev.map((trade) =>
          trade.id === closePositionModal.tradeId
            ? {
                ...trade,
                status: "closed",
                exitDate: new Date().toISOString(),
                exitMarketCap: closePositionModal.currentMarketCap,
                exitMarketCapDisplay: formatMarketCap(closePositionModal.currentMarketCap),
              }
            : trade
        )
      );
    }

    setClosePositionModal({
      isOpen: false,
      tradeId: null,
      exitMarketCap: "",
      exitMarketCapValue: null,
      currentMarketCap: null,
      isLoadingCurrentMC: false
    });
  };

  const closePosition = async () => {
    if (!closePositionModal.exitMarketCap) {
      setValidationModal({
        isOpen: true,
        message: "Please enter exit market cap"
      });
      return;
    }

    const parsedExitMarketCap = parseMarketCap(closePositionModal.exitMarketCap);

    if (isNaN(parsedExitMarketCap) || parsedExitMarketCap <= 0) {
      setValidationModal({
        isOpen: true,
        message: "Please enter a valid exit market cap"
      });
      return;
    }

    if (isTestMode) {
      setModifiedTestTrades(prev =>
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
    } else {
      try {
        const tradeRef = doc(db, "trades", closePositionModal.tradeId);
        await updateDoc(tradeRef, {
          status: "closed",
          exitDate: new Date().toISOString(),
          exitMarketCap: parsedExitMarketCap,
          exitMarketCapDisplay: formatMarketCap(parsedExitMarketCap),
        });
      } catch (error) {
        console.error("Error closing trade:", error);
        setValidationModal({
          isOpen: true,
          message: "Error closing trade. Please try again."
        });
        return;
      }
    }

    setClosePositionModal({
      isOpen: false,
      tradeId: null,
      exitMarketCap: "",
      exitMarketCapValue: null,
    });
  };

  // Update fetchCurrentMarketData function
  const fetchCurrentMarketData = async (tokenAddress) => {
    try {
      console.log('Fetching data for token:', tokenAddress);

      // Add delay before API call
      await delayApiCall();

      // Get SOL price from Helius
      const solPriceResponse = await fetch(RPC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'my-id',
          method: 'getAsset',
          params: ['So11111111111111111111111111111111111111112'], // SOL mint address
        }),
      });
      
      if (solPriceResponse.status === 429) {
        console.log('Rate limit hit, waiting before retry...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        return null;
      }
      
      const solPriceData = await solPriceResponse.json();
      console.log('Helius SOL price response:', solPriceData);
      
      const currentSolPrice = solPriceData.result?.token_info?.price_info?.price_per_token || 0;
      console.log('Current SOL price:', currentSolPrice);

      // Add delay before second API call
      await delayApiCall();

      // Get token data
      const response = await fetch(RPC_ENDPOINT, {
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
      
      if (response.status === 429) {
        console.log('Rate limit hit, waiting before retry...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        return null;
      }
      
      const data = await response.json();
      console.log('Helius API response:', data);

      if (data.result && data.result.token_info) {
        const tokenInfo = data.result.token_info;
        const supply = tokenInfo.supply || 0;
        const decimals = tokenInfo.decimals || 0;
        const pricePerToken = tokenInfo.price_info?.price_per_token || 0;
        
        console.log('Token info:', {
          supply,
          decimals,
          pricePerToken
        });
        
        if (pricePerToken > 0) {
          const adjustedSupply = supply / (10 ** decimals);
          const currentMarketCap = adjustedSupply * pricePerToken;
          
          console.log('Calculated values:', {
            adjustedSupply,
            currentMarketCap,
            currentSolPrice
          });
          
          return {
            currentMarketCap,
            currentSolPrice
          };
        }
      }
      console.log('No token data found in Helius response');
      return null;
    } catch (error) {
      console.error('Error fetching current market data:', error);
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

  // Update handleDelete to handle both real and test trades
  const confirmDelete = async () => {
    if (isTestMode) {
      setModifiedTestTrades(prev => prev.filter(trade => trade.id !== deleteModal.tradeId));
    } else {
      try {
        await deleteDoc(doc(db, "trades", deleteModal.tradeId));
      } catch (error) {
        console.error("Error deleting trade:", error);
        setValidationModal({
          isOpen: true,
          message: "Error deleting trade. Please try again."
        });
        return;
      }
    }
    
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
      size: trade.size || '',
      exitDate: trade.exitDate || null,
      entryDate: trade.entryDate
    });
  };

  const handleEditChange = (e, field) => {
    const { value } = e.target;
    setEditingValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Update saveEdit function
  const saveEdit = async (tradeId) => {
    const parsedMarketCap = parseMarketCap(editingValues.marketCapAtEntry);
    const parsedExitMarketCap = editingValues.exitMarketCap ? parseMarketCap(editingValues.exitMarketCap) : null;
    const parsedSize = parseFloat(editingValues.size);

    if (!parsedMarketCap || parsedMarketCap <= 0) {
      setValidationModal({
        isOpen: true,
        message: "Please enter a valid entry market cap"
      });
      return;
    }

    if (!parsedSize || parsedSize <= 0) {
      setValidationModal({
        isOpen: true,
        message: "Please enter a valid size"
      });
      return;
    }

    const updatedTrade = {
      marketCapAtEntryValue: parsedMarketCap,
      exitMarketCap: parsedExitMarketCap,
      status: parsedExitMarketCap ? 'closed' : 'open',
      note: editingValues.note,
      size: parsedSize,
      exitDate: parsedExitMarketCap && !editingValues.exitDate ? new Date().toISOString() : editingValues.exitDate
    };

    if (isTestMode) {
      setModifiedTestTrades(prev => prev.map(trade => {
        if (trade.id === tradeId) {
          return {
            ...trade,
            ...updatedTrade,
            entryDate: trade.entryDate,
            exitDate: updatedTrade.exitDate || trade.exitDate
          };
        }
        return trade;
      }));
    } else {
      try {
        // Update in Firestore
        const tradeRef = doc(db, "trades", tradeId);
        await updateDoc(tradeRef, {
          ...updatedTrade,
          lastUpdateTime: new Date().toISOString()
        });

        console.log('Trade updated in database:', {
          tradeId,
          updates: updatedTrade
        });
      } catch (error) {
        console.error("Error updating trade:", error);
        setValidationModal({
          isOpen: true,
          message: "Error saving changes. Please try again."
        });
        return;
      }
    }
    
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

  // Add useEffect to update statistics when trades or unrealized P&L change
  useEffect(() => {
    const stats = calculateStatistics(displayedTrades, unrealizedPnL);
    setStatistics(stats);
  }, [displayedTrades, unrealizedPnL]);

  // Update the refreshUnrealizedPnL function
  const refreshUnrealizedPnL = async () => {
    setIsRefreshing(true);
    const newUnrealizedPnL = {};
    
    try {
      const openTrades = displayedTrades.filter(trade => 
        trade.status === 'open' && trade.tokenAddress
      );

      // Process trades in batches of 3
      const batchSize = 3;
      for (let i = 0; i < openTrades.length; i += batchSize) {
        const batch = openTrades.slice(i, i + batchSize);
        
        // Process batch sequentially instead of in parallel
        for (const trade of batch) {
          console.log('Processing trade:', trade.ticker);
          
          const currentData = await fetchCurrentMarketData(trade.tokenAddress);
          if (currentData) {
            const { currentMarketCap, currentSolPrice } = currentData;
            const pnlPercentage = ((currentMarketCap - trade.marketCapAtEntryValue) / trade.marketCapAtEntryValue) * 100;
            const entryUSDSize = (trade.size * trade.solPrice) * (trade.marketCapAtEntryValue / trade.marketCapAtEntryValue);
            const currentUSDSize = (trade.size * currentSolPrice) * (currentMarketCap / trade.marketCapAtEntryValue);
            const pnlUSD = currentUSDSize - entryUSDSize;
            
            console.log('Calculated values for', trade.ticker, {
              pnlPercentage,
              pnlUSD,
              currentMarketCap,
              entryUSDSize,
              currentUSDSize
            });
            
            newUnrealizedPnL[trade.id] = {
              pnlPercentage,
              pnlUSD,
              currentMarketCap
            };

            // Update the last known market cap in Firestore if not in test mode
            if (!isTestMode) {
              try {
                const tradeRef = doc(db, "trades", trade.id);
                await updateDoc(tradeRef, {
                  lastKnownMarketCap: currentMarketCap,
                  lastUpdateTime: new Date().toISOString()
                });
                console.log('Updated last known market cap for', trade.ticker);
              } catch (error) {
                console.error('Error updating last known market cap:', error);
              }
            }
          }
        }

        // Add delay between batches
        if (i + batchSize < openTrades.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      console.error('Error refreshing P&L:', error);
      setValidationModal({
        isOpen: true,
        message: "Error refreshing data. Please try again later."
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Add this function inside the TradesTracker component, with the other functions
  const handleTestModeChange = (newValue) => {
    setIsTestMode(newValue);
    if (newValue) {
      // Reset modified test trades to original state when switching to test mode
      setModifiedTestTrades(TEST_TRADES);
    }
    // Reset unrealized P&L when switching modes
    setUnrealizedPnL({});
  };

  // Add this function inside the TradesTracker component
  const handleDelete = (tradeId) => {
    setDeleteModal({
      isOpen: true,
      tradeId
    });
  };

  // Update the useEffect that loads trades to not auto-refresh
  useEffect(() => {
    const loadUserTrades = async () => {
      if (!user || isTestMode) return;
      
      try {
        console.log('Loading trades for user:', user.uid);
        
        const tradesRef = collection(db, "trades");
        const q = query(tradesRef, where("userId", "==", user.uid));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const loadedTrades = [];
          querySnapshot.forEach((doc) => {
            loadedTrades.push({
              id: doc.id,
              ...doc.data(),
              entryDate: doc.data().entryDate || new Date().toISOString(),
              exitDate: doc.data().exitDate || null
            });
          });
          console.log('Loaded trades:', loadedTrades);
          setTrades(loadedTrades);

          // Use last known values from database instead of fetching new ones
          const newUnrealizedPnL = {};
          loadedTrades.forEach(trade => {
            if (trade.status === 'open' && trade.lastKnownMarketCap) {
              const pnlPercentage = ((trade.lastKnownMarketCap - trade.marketCapAtEntryValue) / trade.marketCapAtEntryValue) * 100;
              const entryUSDSize = (trade.size * trade.solPrice) * (trade.marketCapAtEntryValue / trade.marketCapAtEntryValue);
              const lastKnownUSDSize = (trade.size * trade.solPrice) * (trade.lastKnownMarketCap / trade.marketCapAtEntryValue);
              const pnlUSD = lastKnownUSDSize - entryUSDSize;

              newUnrealizedPnL[trade.id] = {
                pnlPercentage,
                pnlUSD,
                currentMarketCap: trade.lastKnownMarketCap,
                lastUpdate: trade.lastUpdateTime
              };
            }
          });
          setUnrealizedPnL(newUnrealizedPnL);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error setting up trades listener:", error);
        setValidationModal({
          isOpen: true,
          message: "Error connecting to database. Please try again."
        });
      }
    };

    loadUserTrades();
  }, [user, isTestMode]);

  // Add logout function
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AuthModal isOpen={authModal} onClose={() => setAuthModal(false)} />
      {validationModal.isOpen && (
        <ValidationModal
          message={validationModal.message}
          onClose={() => setValidationModal({ isOpen: false, message: '' })}
        />
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Switch
            checked={isTestMode}
            onCheckedChange={handleTestModeChange}
          />
          <span className="text-sm text-gray-400">
            Test Mode {isTestMode ? '(Demo Data)' : '(Real Trades)'}
          </span>
        </div>
        
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-200 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600"
            >
              Logout
            </button>
          </div>
        )}
      </div>

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
          <PnLGraph trades={displayedTrades} />
        </div>

        {/* Summary Stats */}
        <div className="col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
            Trading Summary
          </h3>
          
          {/* Main P&L Display */}
          <div className="mb-8">
            <div className="flex justify-between items-baseline mb-2">
              <p className="text-xl font-bold text-gray-400">Total P&L</p>
              <p className={`text-3xl font-bold ${
                statistics.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                ${formatLargeNumber(statistics.totalPnL)}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-gray-900 rounded-lg">
              <div>
                <p className="text-sm text-gray-400 mb-1">Realized</p>
                <p className={`text-2xl font-semibold ${
                  statistics.totalRealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  ${formatLargeNumber(statistics.totalRealizedPnL)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Unrealized</p>
                <p className={`text-lg font-medium ${
                  statistics.totalUnrealizedPnL >= 0 ? 'text-green-400/80' : 'text-red-400/80'
                }`}>
                  ${formatLargeNumber(statistics.totalUnrealizedPnL)}
                </p>
              </div>
            </div>
          </div>

          {/* Other Stats */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-400">Total Trades</p>
              <p className="text-xl font-semibold text-white mt-1">
                {statistics.totalTrades}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Open Positions</p>
              <p className="text-xl font-semibold text-white mt-1">
                {statistics.openPositions}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Win Rate</p>
              <p className="text-xl font-semibold text-white mt-1">
                {statistics.winRate}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Avg. Trade</p>
              <p className={`text-xl font-semibold mt-1 ${
                statistics.totalRealizedPnL / (statistics.totalTrades - statistics.openPositions) >= 0 
                  ? 'text-green-400' 
                  : 'text-red-400'
              }`}>
                ${formatLargeNumber(statistics.totalRealizedPnL / (statistics.totalTrades - statistics.openPositions) || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Trade Tracker
          </h2>
          <button
            onClick={refreshUnrealizedPnL}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh P&L'}
          </button>
        </div>

        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="relative">
                <input
                  type="text"
                  name="tokenAddress"
                  placeholder="Token Address (optional)"
                  value={newTrade.tokenAddress}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="relative">
                <input
                  type="text"
                  name="ticker"
                  placeholder="Ticker Symbol"
                  value={newTrade.ticker}
                  onChange={handleInputChange}
                  disabled={!!newTrade.tokenAddress} // Disable if address is present
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
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
          {/* Desktop/Tablet View */}
          <div className="hidden md:block">
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
                {displayedTrades
                  .sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate))
                  .map((trade) => {
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
                          ) : trade.status === "open" && unrealizedPnL[trade.id] ? (
                            <div>
                              <span className={unrealizedPnL[trade.id].pnlUSD >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                {unrealizedPnL[trade.id].pnlPercentage.toFixed(2)}%
                                <br />
                                ${formatLargeNumber(unrealizedPnL[trade.id].pnlUSD)}
                              </span>
                              <div className="mt-1 text-xs">
                                <span className="text-gray-400">Entry MC: </span>
                                <span className="text-gray-300">${formatLargeNumber(trade.marketCapAtEntryValue)}</span>
                                <br />
                                <span className="text-gray-400">Current MC: </span>
                                <span className="text-gray-300">${formatLargeNumber(unrealizedPnL[trade.id].currentMarketCap)}</span>
                              </div>
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

          {/* Mobile View */}
          <div className="md:hidden">
            {displayedTrades
              .sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate))
              .map((trade) => (
                <div 
                  key={trade.id} 
                  className="mb-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {trade.ticker}
                      </span>
                      <span className={`ml-2 text-sm ${
                        trade.status === "open"
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-green-600 dark:text-green-400"
                      }`}>
                        {trade.status.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(trade.entryDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Entry MC: </span>
                      <span className="text-gray-900 dark:text-white">
                        ${formatLargeNumber(trade.marketCapAtEntryValue)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Exit MC: </span>
                      <span className="text-gray-900 dark:text-white">
                        {trade.status === "closed" ? `$${formatLargeNumber(trade.exitMarketCap)}` : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Size: </span>
                      <span className="text-gray-900 dark:text-white">
                        {trade.size} SOL (${((trade.size || 0) * (trade.solPrice || 0)).toFixed(2)})
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">P&L: </span>
                      {trade.status === "closed" ? (
                        <span className={`${
                          (trade.exitMarketCap - trade.marketCapAtEntryValue) > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}>
                          {((trade.exitMarketCap - trade.marketCapAtEntryValue) / trade.marketCapAtEntryValue * 100).toFixed(2)}%
                          <br />
                          ${formatLargeNumber((trade.exitMarketCap - trade.marketCapAtEntryValue) * (trade.size * trade.solPrice / trade.marketCapAtEntryValue))}
                        </span>
                      ) : trade.status === "open" && unrealizedPnL[trade.id] ? (
                        <div>
                          <span className={`${
                            unrealizedPnL[trade.id].pnlUSD >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}>
                            {unrealizedPnL[trade.id].pnlPercentage.toFixed(2)}%
                            <br />
                            ${formatLargeNumber(unrealizedPnL[trade.id].pnlUSD)}
                          </span>
                          <div className="mt-1 text-xs">
                            <span className="text-gray-400">Entry MC: </span>
                            <span className="text-gray-300">${formatLargeNumber(trade.marketCapAtEntryValue)}</span>
                            <br />
                            <span className="text-gray-400">Current MC: </span>
                            <span className="text-gray-300">${formatLargeNumber(unrealizedPnL[trade.id].currentMarketCap)}</span>
                          </div>
                        </div>
                      ) : (
                        "-"
                      )}
                    </div>
                  </div>

                  {trade.note && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      Note: {trade.note}
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      onClick={() => startEditing(trade)}
                    >
                      Edit
                    </button>
                    {trade.status === "open" && (
                      <button
                        className="text-green-600 hover:text-green-800 text-sm"
                        onClick={() => openClosePositionModal(trade.id)}
                      >
                        Close
                      </button>
                    )}
                    <button
                      className="text-red-600 hover:text-red-800 text-sm"
                      onClick={() => handleDelete(trade.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradesTracker;
