const { pool } = require('../config/db');

const getReturns = async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can access their returns' });
    }

    const farmerId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const [countResult, returnsResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total FROM returns WHERE farmer_id = $1`,
        [farmerId]
      ),
      pool.query(
        `SELECT r.id, r.order_id, r.buyer_id, r.reason, r.status, r.refund_status,
                r.restock_quantity, r.created_at, r.updated_at,
                u.name AS buyer_name, u.email AS buyer_email
         FROM returns r
         JOIN users u ON u.id = r.buyer_id
         WHERE r.farmer_id = $1
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [farmerId, limit, offset]
      ),
    ]);

    const total = countResult.rows[0].total;

    return res.status(200).json({
      returns: returnsResult.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch returns failed:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const createReturn = async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can create returns' });
    }

    const farmerId = req.user.id;
    const { order_id, reason, restock_quantity } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'reason is required' });
    }

    if (!order_id) {
      return res.status(400).json({ message: 'order_id is required' });
    }

    // Verify order belongs to farmer
    const orderCheck = await pool.query(
      `SELECT o.id, o.buyer_id
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       WHERE o.id = $1 AND p.farmer_id = $2
       LIMIT 1`,
      [order_id, farmerId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Order not found or not authorized' });
    }

    const order = orderCheck.rows[0];

    const insertResult = await pool.query(
      `INSERT INTO returns (order_id, farmer_id, buyer_id, reason, restock_quantity)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [order_id, farmerId, order.buyer_id, reason.trim(), restock_quantity || 0]
    );

    return res.status(201).json({ return: insertResult.rows[0] });
  } catch (error) {
    console.error('Create return failed:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateReturn = async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can update returns' });
    }

    const farmerId = req.user.id;
    const returnId = parseInt(req.params.id);
    const { action } = req.body;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: "action must be 'accept' or 'reject'" });
    }

    // Fetch the return record
    const returnCheck = await pool.query(
      `SELECT * FROM returns WHERE id = $1`,
      [returnId]
    );

    if (returnCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Return not found' });
    }

    const returnRecord = returnCheck.rows[0];

    if (returnRecord.farmer_id != farmerId) {
      return res.status(403).json({ message: 'Return not found or not authorized' });
    }

    if (returnRecord.status !== 'pending') {
      return res.status(409).json({ message: 'Return is already resolved' });
    }

    let updatedReturn;

    if (action === 'accept') {
      const updateResult = await pool.query(
        `UPDATE returns SET status='accepted', refund_status='pending', updated_at=NOW()
         WHERE id=$1 RETURNING *`,
        [returnId]
      );
      await pool.query(
        `UPDATE orders SET order_status='returned' WHERE id=$1`,
        [returnRecord.order_id]
      );
      updatedReturn = updateResult.rows[0];
    } else {
      const updateResult = await pool.query(
        `UPDATE returns SET status='rejected', updated_at=NOW()
         WHERE id=$1 RETURNING *`,
        [returnId]
      );
      updatedReturn = updateResult.rows[0];
    }

    return res.status(200).json({ return: updatedReturn });
  } catch (error) {
    console.error('Update return failed:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getReturns, createReturn, updateReturn };
