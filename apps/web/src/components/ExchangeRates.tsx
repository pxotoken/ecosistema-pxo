import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  History,
  Coins,
} from "lucide-react";
import { useActiveAccount, useActiveWallet, useActiveWalletChain } from "thirdweb/react";
import { usePXOExchange } from "../hooks/usePXOExchange";
import { usePXOSell } from "../hooks/usePXOSell";
import { useTokens } from "../hooks/useTokens";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../routes/paths";
import useWalletStore from "../store/useWalletStore";
import { TransactionHistory } from "./TransactionHistory";
import { useToast } from "./ui/Toast";
import { ConfirmationModal } from "./ui/Modal";
import { TransactionProgress } from "./TransactionProgress";
import { useAuthContext } from "../contexts/AuthContext";
import { isExternalAuthProvider, isNonCustodialWallet } from "../lib/walletUtils";
import { getExplorerTxUrl } from "../lib/explorer";

type ExchangeMode = 'buy' | 'sell';

export const ExchangeRates: React.FC = () => {
  const [exchangeMode, setExchangeMode] = React.useState<ExchangeMode>('buy');
  const [lastUpdate, setLastUpdate] = React.useState(new Date());
  const [showHistory, setShowHistory] = React.useState(false);
  const [refreshHistory, setRefreshHistory] = React.useState(0);
  const [previousRate, setPreviousRate] = React.useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [showTransactionProgress, setShowTransactionProgress] =
    React.useState(false);
  const [transactionSteps, setTransactionSteps] = React.useState<any[]>([]);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [inputValue, setInputValue] = React.useState<string>("");
  const [balanceError, setBalanceError] = React.useState<string>("");
  const [sellInputValue, setSellInputValue] = React.useState<string>("");
  const [sellBalanceError, setSellBalanceError] = React.useState<string>("");
  const [pendingConfirmMode, setPendingConfirmMode] = React.useState<ExchangeMode | null>(null);
  const [awaitingSignature, setAwaitingSignature] = React.useState(false);
  const [signatureSecondsLeft, setSignatureSecondsLeft] = React.useState<number | null>(null);

  const {
    amount,
    setAmount,
    pxoAmount,
    loading,
    initialLoading,
    error,
    handleBuyPXO,
    exchangeRate,
    buyPrice,
  } = usePXOExchange(() => {
    setRefreshHistory((prev) => prev + 1);
  });

  const {
    pxoAmount: sellPxoAmount,
    setPxoAmount: setSellPxoAmount,
    usdcAmount: sellUsdcAmount,
    loading: sellLoading,
    error: sellError,
    handleSellPXO,
    sellPrice,
    tokenSymbol: sellTokenSymbol,
  } = usePXOSell(() => {
    setRefreshHistory((prev) => prev + 1);
  });

  const { tokens, loading: tokensLoading, refreshTokens } = useTokens();
  const { addToast } = useToast();
  const { logout, user } = useAuthContext();
  const navigate = useNavigate();
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const wallet = useActiveWallet();
  const isNonCustodial = isNonCustodialWallet(wallet);
  const { tokens: walletTokens } = useWalletStore();

  const tokenSymbol = "USDC";
  const token = tokens.find((t) => t.symbol === tokenSymbol);
  // Use pricing service price, fallback to token price or exchangeRate
  const currentRate = buyPrice || token?.pxo_buy_price || exchangeRate || 1.12;

  const availableTokens = activeChain?.id ? walletTokens[activeChain.id] || [] : [];
  const walletToken = availableTokens.find((t) => t.symbol === tokenSymbol);
  const pxoWalletToken = availableTokens.find((t) => t.symbol === "PXO");

  const { balance: userBalance, loading: balanceLoading } = useTokenBalance({
    tokenAddress: walletToken?.address,
    tokenSymbol: tokenSymbol,
    pollingInterval: 5000,
    enabled: !!walletToken?.address,
  });

  const { balance: pxoBalance, loading: pxoBalanceLoading } = useTokenBalance({
    tokenAddress: pxoWalletToken?.address,
    tokenSymbol: "PXO",
    pollingInterval: 5000,
    enabled: !!pxoWalletToken?.address && exchangeMode === "sell",
  });

  // Calculate price change
  React.useEffect(() => {
    if (previousRate !== null && currentRate !== previousRate) {
      setLastUpdate(new Date());
    }
    setPreviousRate(currentRate);
  }, [currentRate, previousRate]);

  // Calculate change from previous rate
  const calculateChange = () => {
    if (previousRate === null || previousRate === currentRate) {
      return { change: 0, changePercent: 0 };
    }
    const change = currentRate - previousRate;
    const changePercent = (change / previousRate) * 100;
    return { change, changePercent };
  };

  const { change, changePercent } = calculateChange();

  // Auto-refresh tokens every 30 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      refreshTokens();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refreshTokens]);

  // Reset transaction progress state on component mount
  React.useEffect(() => {
    setShowTransactionProgress(false);
    setTransactionSteps([]);
    setCurrentStep(0);
  }, []);

  React.useEffect(() => {
    if (amount === 0) {
      setInputValue("");
      setBalanceError("");
    }
  }, [amount]);

  React.useEffect(() => {
    if (sellPxoAmount === 0) {
      setSellInputValue("");
      setSellBalanceError("");
    }
  }, [sellPxoAmount]);

  // Clear balance error when balance updates
  React.useEffect(() => {
    if (amount > 0 && amount <= userBalance) {
      setBalanceError("");
    }
  }, [userBalance, amount]);

  // Generate dynamic high/low values based on current rate (simulated)
  const generateHighLow = (rate: number) => {
    const volatility = 0.02; // 2% volatility
    const high = rate * (1 + volatility);
    const low = rate * (1 - volatility);
    return { high, low };
  };

  const { high, low } = generateHighLow(currentRate);

  // Create exchange rates data dynamically
  const exchangeRates = [
    {
      pair: `PXO/${tokenSymbol}`,
      rate: currentRate,
      change: change,
      changePercent: changePercent,
      high: high,
      low: low,
      bankRate: currentRate * 0.97, // Bank rate is typically lower
      spread: currentRate * 0.03, // 3% spread
    },
  ];

  const handleRefresh = async () => {
    setLastUpdate(new Date());
    try {
      await refreshTokens(); // Refresh token data from database
    } catch (error) {
      // Check if it's an authentication error
      if (handleAuthError(error)) {
        return; // Stop execution if it's an auth error
      }

      addToast({
        type: "error",
        title: "Update failed",
        description: "Could not update exchange rates",
      });
    }
  };

  // Function to handle authentication errors
  const handleAuthError = (error: any) => {
    const errorMessage =
      error?.message || error?.error || "Authentication error";

    // Check if it's an authentication error
    if (
      errorMessage.includes("Authentication required") ||
      errorMessage.includes("401") ||
      errorMessage.includes("Unauthorized") ||
      errorMessage.includes("Token expired") ||
      errorMessage.includes("Invalid token")
    ) {
      addToast({
        type: "error",
        title: "Session expired",
        description:
          "Your session has expired. Please log in again, you will be redirected to the login page in 10 seconds.",
        duration: 15000,
      });

      // Close any open modals
      setShowConfirmation(false);
      setShowTransactionProgress(false);
      setTransactionSteps([]);
      setCurrentStep(0);

      // Logout and redirect to login after a short delay
      setTimeout(() => {
        logout();
      }, 10000);

      return true; // Indicates this was an auth error
    }
    return false; // Not an auth error
  };

  const handleExchange = () => {
    if (amount <= 0) {
      addToast({
        type: "error",
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0",
      });
      return;
    }
    setPendingConfirmMode("buy");
    setShowConfirmation(true);
  };

  const handleSellExchange = () => {
    if (sellPxoAmount <= 0) {
      addToast({
        type: "error",
        title: "Invalid amount",
        description: "Introduce una cantidad válida de PXO",
      });
      return;
    }
    if (sellPxoAmount > pxoBalance) {
      addToast({
        type: "error",
        title: "Insufficient balance",
        description: `Tienes ${pxoBalance.toFixed(4)} PXO`,
      });
      return;
    }
    setPendingConfirmMode("sell");
    setShowConfirmation(true);
  };

  const buildExchangeSignatureCallbacks = () => {
    if (!isNonCustodial) return undefined;
    const external = isExternalAuthProvider(user, wallet);
    return {
      onBeforeSign: () => setAwaitingSignature(true),
      onSignatureCountdown: external ? (s: number | null) => setSignatureSecondsLeft(s) : undefined,
    };
  };

  const isLiquidityError = (message: unknown) => {
    if (typeof message !== "string") return false;
    const m = message.toLowerCase();
    return m.includes("liquidity") || m.includes("pxo liquidity") || m.includes("usdc liquidity");
  };

  const confirmExchange = async () => {
    const isSell = pendingConfirmMode === "sell";
    setShowConfirmation(false);
    setPendingConfirmMode(null);
    if (isSell) {
      confirmSell();
      return;
    }
    setShowTransactionProgress(true);
    const steps = [
      { id: "validate", title: "Validating transaction", description: "Verifying data and connectivity", status: "loading" as const },
      { id: "gas", title: "Calculating gas", description: "Estimating transaction costs", status: "pending" as const },
      { id: "transfer", title: "Sending tokens", description: "Processing transfer", status: "pending" as const },
      { id: "pxo", title: "Sending PXO", description: "Completing exchange", status: "pending" as const },
    ];
    setTransactionSteps(steps);
    setCurrentStep(0);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      setTransactionSteps((prev) => prev.map((s, i) => (i === 0 ? { ...s, status: "completed" } : s)));
      setCurrentStep(1);
      await new Promise((r) => setTimeout(r, 1500));
      setTransactionSteps((prev) => prev.map((s, i) => (i === 1 ? { ...s, status: "completed" } : s)));
      setCurrentStep(2);
      const result = await handleBuyPXO(buildExchangeSignatureCallbacks());
      setAwaitingSignature(false);
      setSignatureSecondsLeft(null);
      if (result?.success) {
        setTransactionSteps((prev) => prev.map((s, i) => (i === 2 ? { ...s, status: "completed", txHash: result.transactionHash } : s)));
        setCurrentStep(3);
        await new Promise((r) => setTimeout(r, 1000));
        setTransactionSteps((prev) => prev.map((s, i) => (i === 3 ? { ...s, status: "completed", txHash: result.transactionHash } : s)));
        addToast({
          type: "success",
          title: "Purchase successful!",
          description: `You received ${result.pxoAmount} PXO for ${result.usdcAmount} ${tokenSymbol}`,
          action: { label: "View transaction", onClick: () => window.open(getExplorerTxUrl(activeChain?.id, result.transactionHash ?? ''), "_blank") },
        });
        setAmount(0);
        setTimeout(() => navigate(PATHS.dashboard.wallet), 2000);
      } else {
        if (handleAuthError(result)) return;
        const msg = result?.error || "Transaction error";
        if (isLiquidityError(msg)) {
          setShowTransactionProgress(false);
          setTransactionSteps([]);
          setCurrentStep(0);
          addToast({ type: "error", title: "Liquidity limit", description: msg });
          return;
        }
        throw new Error(msg);
      }
    } catch (error) {
      setAwaitingSignature(false);
      setSignatureSecondsLeft(null);
      if (handleAuthError(error)) return;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (isLiquidityError(errorMessage)) {
        setShowTransactionProgress(false);
        setTransactionSteps([]);
        setCurrentStep(0);
        addToast({ type: "error", title: "Liquidity limit", description: errorMessage });
        return;
      }
      setTransactionSteps((prev) =>
        prev.map((s, i) => (i === currentStep ? { ...s, status: "error", error: errorMessage } : s)),
      );
      addToast({ type: "error", title: "Transaction error", description: errorMessage });
    }
  };

  const confirmSell = async () => {
    setShowTransactionProgress(true);
    const steps = [
      { id: "validate", title: "Validating", description: "Verifying data and balance", status: "loading" as const },
      { id: "transfer", title: "Sending PXO", description: "Transfer to exchange", status: "pending" as const },
      { id: "complete", title: "Completing", description: "Receiving USDC", status: "pending" as const },
    ];
    setTransactionSteps(steps);
    setCurrentStep(0);
    try {
      await new Promise((r) => setTimeout(r, 800));
      setTransactionSteps((prev) => prev.map((s, i) => (i === 0 ? { ...s, status: "completed" } : s)));
      setCurrentStep(1);
      const result = await handleSellPXO(buildExchangeSignatureCallbacks());
      setAwaitingSignature(false);
      setSignatureSecondsLeft(null);
      if (result?.success) {
        setTransactionSteps((prev) => prev.map((s, i) => (i === 1 ? { ...s, status: "completed", txHash: result.transactionHash } : s)));
        setCurrentStep(2);
        await new Promise((r) => setTimeout(r, 800));
        setTransactionSteps((prev) => prev.map((s, i) => (i === 2 ? { ...s, status: "completed", txHash: result.transactionHash } : s)));
        addToast({
          type: "success",
          title: "Venta completada",
          description: `Recibiste ${result.usdcAmount?.toFixed(2) ?? sellUsdcAmount.toFixed(2)} ${sellTokenSymbol} por ${result.pxoAmount} PXO`,
          action: { label: "Ver transacción", onClick: () => window.open(getExplorerTxUrl(activeChain?.id, result.transactionHash ?? ''), "_blank") },
        });
        setSellPxoAmount(0);
        setSellInputValue("");
        setSellBalanceError("");
        setTimeout(() => navigate(PATHS.dashboard.wallet), 2000);
      } else {
        if (handleAuthError(result)) return;
        const msg = result?.error || "Sell failed";
        if (isLiquidityError(msg)) {
          setShowTransactionProgress(false);
          setTransactionSteps([]);
          setCurrentStep(0);
          addToast({ type: "error", title: "Límite de liquidez", description: msg });
          return;
        }
        throw new Error(msg);
      }
    } catch (error) {
      setAwaitingSignature(false);
      setSignatureSecondsLeft(null);
      if (handleAuthError(error)) return;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (isLiquidityError(errorMessage)) {
        setShowTransactionProgress(false);
        setTransactionSteps([]);
        setCurrentStep(0);
        addToast({ type: "error", title: "Límite de liquidez", description: errorMessage });
        return;
      }
      setTransactionSteps((prev) =>
        prev.map((s, i) => (i === currentStep ? { ...s, status: "error", error: errorMessage } : s)),
      );
      addToast({ type: "error", title: "Error en la venta", description: errorMessage });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const sanitized = value.replace(/[^0-9.]/g, '');
    setInputValue(sanitized);
    
    if (sanitized === "") {
      setAmount(0);
      setBalanceError("");
      return;
    }
    
    const numValue = Number.parseFloat(sanitized);
    if (!Number.isNaN(numValue) && numValue >= 0) {
      setAmount(numValue);
      if (numValue > userBalance) {
        setBalanceError(`Amount exceeds available balance (${userBalance.toFixed(2)} ${tokenSymbol})`);
      } else {
        setBalanceError("");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-3xl font-bold text-light-text dark:text-dark-text font-editorial">
            PXO Exchange
          </h2>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
            Real-time exchange rates
          </p>
          {activeChain && (
            <span className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <span className={`h-1.5 w-1.5 rounded-full ${activeChain.id === 137 ? 'bg-green-500' : 'bg-amber-500'}`} />
              {activeChain.id === 137 ? 'Polygon Mainnet' : activeChain.id === 80002 ? 'Polygon Amoy' : `Chain ${activeChain.id}`}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowHistory(true)}
            className="p-3 bg-light-glass dark:bg-dark-glass rounded-full hover:bg-lime-accent/10 transition-colors duration-300 flex items-center space-x-2"
          >
            <History className="w-4 h-4 text-light-text dark:text-dark-text" />
            <span className="text-sm font-medium text-light-text dark:text-dark-text">
              History
            </span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, rotate: 180 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={tokensLoading}
            className="p-3 bg-light-glass dark:bg-dark-glass rounded-full hover:bg-lime-accent/10 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`w-5 h-5 text-light-text dark:text-dark-text ${
                tokensLoading ? "animate-spin" : ""
              }`}
            />
          </motion.button>
        </div>
      </motion.div>

      {/* Rates Grid */}
      {false && <div className="flex">
        {tokensLoading ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full md:w-1/2 bg-light-surface/50 dark:bg-dark-surface/50 backdrop-blur-sm border border-light-border dark:border-dark-border rounded-xl p-6 flex items-center justify-center"
          >
            <div className="flex items-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin text-lime-accent" />
              <span className="text-light-text dark:text-dark-text">
                Loading exchange rates...
              </span>
            </div>
          </motion.div>
        ) : (
          exchangeRates.map((rate, index) => (
            <motion.div
              key={rate.pair}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="w-full md:w-1/2 bg-light-surface/50 dark:bg-dark-surface/50 backdrop-blur-sm border border-light-border dark:border-dark-border rounded-xl p-6 hover:border-lime-accent/30 transition-all hover:shadow-glow duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <motion.div
                    className="p-2 bg-gradient-to-br from-lime-accent/20 to-lime-accent/10 rounded-lg"
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <Coins className="w-5 h-5 text-lime-accent" />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-bold text-light-text dark:text-dark-text font-editorial">
                      {rate.pair}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-2 h-2 bg-lime-accent rounded-full"
                      />
                      <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                        Last update: {lastUpdate.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right side - Rate Display */}
                <div className="relative">
                  <motion.span
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                    className="text-2xl font-bold text-light-text dark:text-dark-text font-editorial"
                  >
                    {rate.rate.toFixed(4)}
                  </motion.span>
                  {/* Lime accent underline */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="h-1 bg-lime-accent rounded-full mt-1"
                  />
                </div>
              </div>

              {/* <div className={`flex items-center space-x-1 ${rate.change >= 0 ? 'text-lime-accent' : 'text-red-400'}`}>
                {rate.change >= 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
                <span className="font-medium">{rate.changePercent > 0 ? '+' : ''}{rate.changePercent}%</span>
              </div> */}

              {/* <span className={`text-sm ${rate.change >= 0 ? 'text-lime-accent dark:text-dark-text' : 'text-red-400'}`}>
                  {rate.change > 0 ? '+' : ''}{rate.change.toFixed(4)}
                </span> */}

              {/* High/Low */}
              {/* <div className="flex justify-between text-sm">
                <div>
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">High: </span>
                  <span className="text-light-text dark:text-dark-text font-medium">{rate.high.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Low: </span>
                  <span className="text-light-text dark:text-dark-text font-medium">{rate.low.toFixed(4)}</span>
                </div>
              </div> */}
            </motion.div>
          ))
        )}
      </div>}

      {/* Quick Exchange */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-gradient-to-r from-light-surface/80 to-light-glass dark:from-dark-surface/80 dark:to-dark-glass border border-light-border dark:border-dark-border rounded-2xl p-4 sm:p-6 lg:p-8 shadow-glass transition-colors duration-300"
      >
        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-light-text dark:text-dark-text font-editorial mb-4 sm:mb-6">
          Quick Exchange
        </h3>

        {/* Buy / Sell tabs */}
        <div className="flex gap-2 mb-4 sm:mb-6">
          <button
            type="button"
            onClick={() => setExchangeMode("buy")}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
              exchangeMode === "buy"
                ? "bg-lime-accent text-white shadow-glow"
                : "bg-light-glass dark:bg-dark-glass text-light-text dark:text-dark-text hover:border-lime-accent/30 border border-transparent"
            }`}
          >
            Comprar
          </button>
          <button
            type="button"
            onClick={() => setExchangeMode("sell")}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
              exchangeMode === "sell"
                ? "bg-lime-accent text-white shadow-glow"
                : "bg-light-glass dark:bg-dark-glass text-light-text dark:text-dark-text hover:border-lime-accent/30 border border-transparent"
            }`}
          >
            Vender
          </button>
        </div>

        {(exchangeMode === "buy" ? error : sellError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg flex items-center space-x-2"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-red-700 dark:text-red-300 text-sm">
              {exchangeMode === "buy" ? error : sellError}
            </span>
          </motion.div>
        )}

        {exchangeMode === "buy" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            <div className="w-full">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs sm:text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                  From
                </label>
                {!balanceLoading && account && (
                  <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                    Balance: {userBalance.toFixed(2)} {tokenSymbol}
                  </span>
                )}
              </div>
              <div className="flex w-full">
                <select
                  className="bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-l-xl px-2 sm:px-3 py-2.5 sm:py-3 text-sm sm:text-base text-light-text dark:text-dark-text focus:outline-none focus:border-lime-accent/50 transition-colors duration-300 min-w-[70px] sm:min-w-[80px]"
                  disabled
                >
                  <option>{tokenSymbol}</option>
                </select>
                <input
                  type="number"
                  placeholder={tokensLoading ? "Loading prices..." : "Enter amount"}
                  value={inputValue}
                  disabled={tokensLoading}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") e.preventDefault();
                  }}
                  onChange={handleInputChange}
                  onBlur={(e) => {
                    const numValue = Number.parseFloat(e.target.value);
                    if (Number.isNaN(numValue) || numValue <= 0) {
                      setAmount(0);
                      setInputValue("");
                      setBalanceError("");
                    }
                  }}
                  min="0.01"
                  step="any"
                  className="bg-light-glass dark:bg-dark-glass border border-l-0 border-light-border dark:border-dark-border rounded-r-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-light-text dark:text-dark-text focus:outline-none focus:border-lime-accent/50 flex-1 min-w-0 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              {balanceError && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">{balanceError}</p>
              )}
            </div>
            <div className="w-full">
              <label className="block text-xs sm:text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                To
              </label>
              <div className="flex w-full">
                <select
                  className="bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-l-xl px-2 sm:px-3 py-2.5 sm:py-3 text-sm sm:text-base text-light-text dark:text-dark-text focus:outline-none focus:border-lime-accent/50 transition-colors duration-300 min-w-[70px] sm:min-w-[80px]"
                  disabled
                >
                  <option>PXO</option>
                </select>
                <input
                  type="number"
                  placeholder="Equivalente en PXO"
                  value={pxoAmount || ""}
                  readOnly
                  className="bg-light-glass dark:bg-dark-glass border border-l-0 border-light-border dark:border-dark-border rounded-r-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-light-text dark:text-dark-text focus:outline-none focus:border-lime-accent/50 flex-1 min-w-0 transition-colors duration-300"
                />
              </div>
            </div>
            <div className="w-full sm:col-span-2 lg:col-span-1 flex items-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleExchange}
                disabled={initialLoading || loading || amount <= 0 || amount > userBalance}
                className="w-full bg-lime-accent text-white px-6 py-3 sm:py-3.5 rounded-xl font-medium text-sm sm:text-base hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Buy PXO</span>
                )}
              </motion.button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            <div className="w-full">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs sm:text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                  From
                </label>
                {!pxoBalanceLoading && account && (
                  <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                    Balance: {pxoBalance.toFixed(4)} PXO
                  </span>
                )}
              </div>
              <div className="flex w-full">
                <select
                  className="bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-l-xl px-2 sm:px-3 py-2.5 sm:py-3 text-sm sm:text-base text-light-text dark:text-dark-text focus:outline-none focus:border-lime-accent/50 transition-colors duration-300 min-w-[70px] sm:min-w-[80px]"
                  disabled
                >
                  <option>PXO</option>
                </select>
                <input
                  type="number"
                  placeholder={sellPrice ? "Cantidad de PXO" : "Loading..."}
                  value={sellInputValue}
                  disabled={!sellPrice}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") e.preventDefault();
                  }}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, "");
                    setSellInputValue(value);
                    if (value === "") {
                      setSellPxoAmount(0);
                      setSellBalanceError("");
                      return;
                    }
                    const num = Number.parseFloat(value);
                    if (!Number.isNaN(num) && num >= 0) {
                      setSellPxoAmount(num);
                      setSellBalanceError(
                        num > pxoBalance ? `Amount exceeds balance (${pxoBalance.toFixed(4)} PXO)` : ""
                      );
                    }
                  }}
                  onBlur={(e) => {
                    const num = Number.parseFloat(e.target.value);
                    if (Number.isNaN(num) || num <= 0) {
                      setSellPxoAmount(0);
                      setSellInputValue("");
                      setSellBalanceError("");
                    }
                  }}
                  min="0.0001"
                  step="any"
                  className="bg-light-glass dark:bg-dark-glass border border-l-0 border-light-border dark:border-dark-border rounded-r-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-light-text dark:text-dark-text focus:outline-none focus:border-lime-accent/50 flex-1 min-w-0 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              {sellBalanceError && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">{sellBalanceError}</p>
              )}
            </div>
            <div className="w-full">
              <label className="block text-xs sm:text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                To
              </label>
              <div className="flex w-full">
                <select
                  className="bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-l-xl px-2 sm:px-3 py-2.5 sm:py-3 text-sm sm:text-base text-light-text dark:text-dark-text focus:outline-none focus:border-lime-accent/50 transition-colors duration-300 min-w-[70px] sm:min-w-[80px]"
                  disabled
                >
                  <option>{sellTokenSymbol}</option>
                </select>
                <input
                  type="number"
                  placeholder="Recibirás"
                  value={sellUsdcAmount || ""}
                  readOnly
                  className="bg-light-glass dark:bg-dark-glass border border-l-0 border-light-border dark:border-dark-border rounded-r-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-light-text dark:text-dark-text focus:outline-none focus:border-lime-accent/50 flex-1 min-w-0 transition-colors duration-300"
                />
              </div>
            </div>
            <div className="w-full sm:col-span-2 lg:col-span-1 flex items-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSellExchange}
                disabled={sellLoading || sellPxoAmount <= 0 || sellPxoAmount > pxoBalance}
                className="w-full bg-lime-accent text-white px-6 py-3 sm:py-3.5 rounded-xl font-medium text-sm sm:text-base hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {sellLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Vender PXO</span>
                )}
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Transaction History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowHistory(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-light-glass dark:bg-dark-glass rounded-full hover:bg-lime-accent/10 transition-colors duration-300"
              >
                <span className="text-2xl text-light-text dark:text-dark-text">
                  ×
                </span>
              </motion.button>
              
              <div className="overflow-y-auto max-h-[90vh]">
                <TransactionHistory key={refreshHistory} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => {
          setShowConfirmation(false);
          setPendingConfirmMode(null);
        }}
        onConfirm={confirmExchange}
        title={pendingConfirmMode === "sell" ? "Confirmar venta" : "Confirm exchange"}
        description={
          pendingConfirmMode === "sell"
            ? `¿Vender ${sellPxoAmount.toFixed(8)} PXO por aproximadamente ${sellUsdcAmount.toFixed(2)} ${sellTokenSymbol}?`
            : `Are you sure you want to exchange ${amount} ${tokenSymbol} for ${pxoAmount.toFixed(8)} PXO?`
        }
        confirmText={pendingConfirmMode === "sell" ? "Vender PXO" : "Confirm exchange"}
        cancelText="Cancel"
        type="info"
      />

      {/* Transaction Progress Modal */}
      {showTransactionProgress && transactionSteps.length > 0 && (
        <TransactionProgress
          isOpen={showTransactionProgress}
          onClose={() => {
            setShowTransactionProgress(false);
            setTransactionSteps([]);
            setCurrentStep(0);
          }}
          steps={transactionSteps}
          currentStep={currentStep}
          title="Processing exchange"
          isAwaitingSignature={awaitingSignature}
          signatureSecondsLeft={signatureSecondsLeft}
          onViewTransaction={(txHash) => {
            window.open(getExplorerTxUrl(activeChain?.id, txHash), "_blank");
          }}
        />
      )}
    </div>
  );
};
