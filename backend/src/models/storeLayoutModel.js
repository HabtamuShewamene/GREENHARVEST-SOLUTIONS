const { pool } = require("../config/db");

const getStoreLayout = async (farmer_id) => {
  const query = `
    SELECT * FROM store_layouts
    WHERE farmer_id = $1;
  `;
  const result = await pool.query(query, [farmer_id]);
  
  if (result.rows.length === 0) {
    // Create a default layout if none exists
    const defaultModules = JSON.stringify([
      {
        id: 'banner-1',
        type: 'banner',
        content: {
          title: 'FRESH HARVEST 2024',
          subtitle: 'Direct from the valley to your table.',
          buttonLink: '/collections/new',
          imageUrl: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80'
        },
        styles: {
          paddingTop: 48,
          paddingBottom: 48,
          overlayOpacity: 30,
          textColor: '#ffffff'
        },
        order: 0
      },
      {
        id: 'categories-1',
        type: 'categories',
        content: {
          title: 'SHOP BY CATEGORY'
        },
        styles: {},
        order: 1
      },
      {
        id: 'products-1',
        type: 'products',
        content: {
          title: 'TOP SELLING PRODUCTS'
        },
        styles: {},
        order: 2
      }
    ]);
    
    const defaultTheme = JSON.stringify({
      theme: 'Agri-Vibrant',
      font: 'Inter'
    });

    const insertQuery = `
      INSERT INTO store_layouts (farmer_id, theme_settings, modules)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const insertResult = await pool.query(insertQuery, [farmer_id, defaultTheme, defaultModules]);
    return insertResult.rows[0];
  }
  
  return result.rows[0];
};

const updateStoreLayout = async (farmer_id, data) => {
  const { theme_settings, modules, is_published } = data;
  
  // We do an upsert
  const query = `
    INSERT INTO store_layouts (farmer_id, theme_settings, modules, is_published)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (farmer_id) DO UPDATE 
    SET theme_settings = $2, modules = $3, is_published = $4, updated_at = NOW()
    RETURNING *;
  `;
  
  const result = await pool.query(query, [
    farmer_id,
    JSON.stringify(theme_settings || {}),
    JSON.stringify(modules || []),
    is_published || false
  ]);
  
  return result.rows[0];
};

module.exports = {
  getStoreLayout,
  updateStoreLayout
};
