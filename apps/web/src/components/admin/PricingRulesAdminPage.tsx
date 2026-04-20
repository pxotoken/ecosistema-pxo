import React, { useState } from 'react';
import { usePricingRules, PricingRule } from '../../hooks/usePricingRules';
import useAuth from '../../hooks/useAuth';
import { 
  Loader2, 
  AlertTriangle, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react';
import { motion } from 'framer-motion';
import { PricingRuleModal } from './PricingRuleModal';
import { PricingRuleTestModal } from './PricingRuleTestModal';

export const PricingRulesAdminPage: React.FC = () => {
  const { user: currentUser, isAuthenticated, loading: authLoading } = useAuth();
  const { rules, loading, error, createRule, updateRule, deleteRule, testPrice, refetch } = usePricingRules();
  const [selectedRule, setSelectedRule] = useState<PricingRule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testPair, setTestPair] = useState<string>('');
  const [testType, setTestType] = useState<'buy' | 'sell'>('buy');

  const isAdmin = currentUser?.user_type?.includes("989e3702-b515-4d6e-8627-fa0142a1a88f") || 
                  currentUser?.mail === "admin@pxo.com";

  const handleCreate = () => {
    setSelectedRule(null);
    setIsModalOpen(true);
  };

  const handleEdit = (rule: PricingRule) => {
    setSelectedRule(rule);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing rule?')) {
      return;
    }
    try {
      await deleteRule(id);
    } catch (err) {
      alert('Error deleting rule: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleTest = (pair: string, type: 'buy' | 'sell') => {
    setTestPair(pair);
    setTestType(type);
    setIsTestModalOpen(true);
  };

  const handleSave = async (ruleData: Omit<PricingRule, 'id' | 'updated_at'> | Partial<PricingRule> & { id: string }) => {
    try {
      if (selectedRule) {
        await updateRule(selectedRule.id, ruleData);
      } else {
        await createRule(ruleData as Omit<PricingRule, 'id' | 'updated_at'>);
      }
      setIsModalOpen(false);
      setSelectedRule(null);
    } catch (err) {
      alert('Error saving: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-lime-accent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                Access Denied
              </h1>
              <p className="text-red-600 dark:text-red-400">
                You must be authenticated to access this page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                Access Denied
              </h1>
              <p className="text-red-600 dark:text-red-400">
                You do not have administrator permissions to access this page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mb-2">
            Pricing Rules Management
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Manage pricing rules and spreads for trading pairs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-gradient-to-br from-light-surface to-light-glass dark:from-dark-surface dark:to-dark-glass border border-light-border dark:border-dark-border rounded-lg p-4 shadow-glass"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-lime-accent/20 rounded-lg">
                <DollarSign className="h-6 w-6 text-lime-accent" />
              </div>
              <div>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Total Rules
                </p>
                <p className="text-2xl font-bold text-light-text dark:text-dark-text">
                  {rules.length}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-gradient-to-br from-light-surface to-light-glass dark:from-dark-surface dark:to-dark-glass border border-light-border dark:border-dark-border rounded-lg p-4 shadow-glass"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Average Buy Spread
                </p>
                <p className="text-2xl font-bold text-light-text dark:text-dark-text">
                  {rules.length > 0 
                    ? (rules.reduce((sum, r) => sum + r.spread_buy, 0) / rules.length * 100).toFixed(2) + '%'
                    : '0%'}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-gradient-to-br from-light-surface to-light-glass dark:from-dark-surface dark:to-dark-glass border border-light-border dark:border-dark-border rounded-lg p-4 shadow-glass"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <TrendingDown className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Average Sell Spread
                </p>
                <p className="text-2xl font-bold text-light-text dark:text-dark-text">
                  {rules.length > 0 
                    ? (rules.reduce((sum, r) => sum + r.spread_sell, 0) / rules.length * 100).toFixed(2) + '%'
                    : '0%'}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-glass border border-light-border dark:border-dark-border p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-lime-accent hover:bg-lime-accent/90 text-black rounded-lg font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Rule
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={refetch}
              className="flex items-center gap-2 px-4 py-2 bg-light-glass dark:bg-dark-glass hover:bg-light-border dark:hover:bg-dark-border border border-light-border dark:border-dark-border text-light-text dark:text-dark-text rounded-lg font-medium transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </motion.button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-lime-accent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-light-border dark:border-dark-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-light-text dark:text-dark-text">Pair</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-light-text dark:text-dark-text">Spread Buy</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-light-text dark:text-dark-text">Spread Sell</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-light-text dark:text-dark-text">Last Update</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-light-text dark:text-dark-text">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-light-text-secondary dark:text-dark-text-secondary">
                        No pricing rules configured
                      </td>
                    </tr>
                  ) : (
                    rules.map((rule) => (
                      <tr 
                        key={rule.id} 
                        className="border-b border-light-border dark:border-dark-border hover:bg-light-glass dark:hover:bg-dark-glass transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className="font-mono font-semibold text-light-text dark:text-dark-text">
                            {rule.pair}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            {(rule.spread_buy * 100).toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-orange-600 dark:text-orange-400 font-medium">
                            {(rule.spread_sell * 100).toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          {new Date(rule.updated_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleTest(rule.pair, 'buy')}
                              className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                              title="Test buy price"
                            >
                              <Play className="h-4 w-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleTest(rule.pair, 'sell')}
                              className="p-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-600 dark:text-orange-400 rounded-lg transition-colors"
                              title="Test sell price"
                            >
                              <Play className="h-4 w-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleEdit(rule)}
                              className="p-2 bg-lime-accent/20 hover:bg-lime-accent/30 text-lime-accent rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(rule.id)}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </motion.button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      <PricingRuleModal
        rule={selectedRule}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRule(null);
        }}
        onSave={handleSave}
      />

      <PricingRuleTestModal
        pair={testPair}
        type={testType}
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onTest={testPrice}
      />
    </div>
  );
};

