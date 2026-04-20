import { getServerSupabase } from '../../lib/supabase.js';
import { withAdminAuth } from '../../lib/authMiddleware.js';

async function handler(req, res) {
  const supabase = getServerSupabase();

  if (req.method === 'GET') {
    try {
      const { pair } = req.query;

      let query = supabase
        .from('pricing_rules')
        .select('*')
        .order('pair');

      if (pair) {
        query = query.eq('pair', pair);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching pricing rules:', error);
        return res.status(500).json({ error: 'Failed to fetch pricing rules' });
      }

      return res.status(200).json({
        success: true,
        data: data || [],
        count: data?.length || 0
      });

    } catch (error) {
      console.error('❌ Error in GET pricing-rules:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { pair, spread_buy, spread_sell } = req.body;

      if (!pair || spread_buy === undefined || spread_sell === undefined) {
        return res.status(400).json({
          error: 'Missing required fields: pair, spread_buy, spread_sell'
        });
      }

      if (spread_buy < 0 || spread_sell < 0) {
        return res.status(400).json({
          error: 'Spread values must be non-negative'
        });
      }

      const { data, error } = await supabase
        .from('pricing_rules')
        .insert({
          pair: pair.toUpperCase(),
          spread_buy,
          spread_sell,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating pricing rule:', error);
        return res.status(500).json({ error: 'Failed to create pricing rule' });
      }

      return res.status(201).json({
        success: true,
        data,
        message: 'Pricing rule created successfully'
      });

    } catch (error) {
      console.error('❌ Error in POST pricing-rules:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, pair, spread_buy, spread_sell } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Missing required field: id' });
      }

      const updateData = {};
      if (pair !== undefined) updateData.pair = pair.toUpperCase();
      if (spread_buy !== undefined) {
        if (spread_buy < 0) {
          return res.status(400).json({ error: 'spread_buy must be non-negative' });
        }
        updateData.spread_buy = spread_buy;
      }
      if (spread_sell !== undefined) {
        if (spread_sell < 0) {
          return res.status(400).json({ error: 'spread_sell must be non-negative' });
        }
        updateData.spread_sell = spread_sell;
      }
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('pricing_rules')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating pricing rule:', error);
        return res.status(500).json({ error: 'Failed to update pricing rule' });
      }

      if (!data) {
        return res.status(404).json({ error: 'Pricing rule not found' });
      }

      return res.status(200).json({
        success: true,
        data,
        message: 'Pricing rule updated successfully'
      });

    } catch (error) {
      console.error('❌ Error in PUT pricing-rules:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Missing required parameter: id' });
      }

      const { error } = await supabase
        .from('pricing_rules')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting pricing rule:', error);
        return res.status(500).json({ error: 'Failed to delete pricing rule' });
      }

      return res.status(200).json({
        success: true,
        message: 'Pricing rule deleted successfully'
      });

    } catch (error) {
      console.error('❌ Error in DELETE pricing-rules:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler);

