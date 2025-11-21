import { getClient } from '../config/database.js';
import { logger } from '../config/logger.js';

export const saveHistory = async (req, res, next) => {
    try {
        const { userId, questionData, canvasData, status, subject } = req.body;
        console.log('📝 [History] Saving history for user:', userId);

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required.' });
        }

        const supabase = getClient();

        const { data, error } = await supabase
            .from('history')
            .insert({
                user_id: userId,
                question_data: questionData,
                canvas_data: canvasData,
                status,
                subject,
            })
            .select()
            .single();

        if (error) {
            console.error('❌ [History] Save error:', error);
            throw error;
        }

        console.log('✅ [History] Saved item:', data.id);
        return res.status(201).json({ success: true, data });
    } catch (error) {
        logger.error('Error saving history:', error);
        return next(error);
    }
};

export const updateHistory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, canvasData } = req.body;
        console.log('📝 [History] Updating history:', id, status);

        if (!id) {
            return res.status(400).json({ message: 'History ID is required.' });
        }

        const supabase = getClient();

        const updates = {};
        if (status) updates.status = status;
        if (canvasData) updates.canvas_data = canvasData;
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('history')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('❌ [History] Update error:', error);
            throw error;
        }

        console.log('✅ [History] Updated item:', data.id);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        logger.error('Error updating history:', error);
        return next(error);
    }
};

export const getHistory = async (req, res, next) => {
    try {
        const { userId, page = 1, limit = 30, status, subject } = req.query;
        console.log('📝 [History] Fetching history for user:', userId, 'Status:', status);

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required.' });
        }

        const supabase = getClient();
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from('history')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (status && status !== 'All') {
            query = query.eq('status', status.toLowerCase());
        }

        if (subject) {
            query = query.eq('subject', subject);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('❌ [History] Fetch error:', error);
            throw error;
        }

        console.log(`✅ [History] Found ${data.length} items`);
        return res.status(200).json({
            success: true,
            data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / limit),
            },
        });
    } catch (error) {
        logger.error('Error fetching history:', error);
        return next(error);
    }
};

export const getHistoryDetail = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: 'History ID is required.' });
        }

        const supabase = getClient();

        const { data, error } = await supabase
            .from('history')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ message: 'History item not found.' });
        }

        return res.status(200).json({ success: true, data });
    } catch (error) {
        logger.error('Error fetching history detail:', error);
        return next(error);
    }
};
