const axios = require('axios');

// Configuration
const BASE_URL = process.env.HASURA_REST_API_ENDPOINT;
const JWT_TOKEN = process.env.HASURA_JWT_TOKEN;
const TIMEOUT = 30000; // 30 seconds

// Validate configuration
if (!BASE_URL) {
  throw new Error('HASURA_REST_API_ENDPOINT environment variable is required');
}

if (!JWT_TOKEN) {
  throw new Error('HASURA_JWT_TOKEN environment variable is required');
}

// Create axios client - since BASE_URL is the complete endpoint, we don't need baseURL
const client = axios.create({
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${JWT_TOKEN}`,
  },
  timeout: TIMEOUT,
});

// Add request/response interceptors for logging
client.interceptors.request.use(
  (config) => {
    console.log(`[Hasura API] Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[Hasura API] Request Error:', error.message);
    return Promise.reject(error);
  }
);

client.interceptors.response.use(
  (response) => {
    console.log(`[Hasura API] Response: ${response.status} - ${response.data?.data ? 'Success' : 'No Data'}`);
    return response;
  },
  (error) => {
    console.error('[Hasura API] Response Error:', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

/**
 * Make REST API call
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} API response data
 */
async function makeRestCall(params = {}) {
  try {
    const response = await client.get(BASE_URL, { params });
    
    // Handle different response structures
    if (response.data.error) {
      throw new Error(`API Error: ${response.data.error}`);
    }

    return response.data;
  } catch (error) {
    console.error('[Hasura API] REST call failed:', error.message);
    throw error;
  }
}

/**
 * Fetch all users from prod_user_data endpoint
 * @returns {Promise<Array>} Array of user objects
 */
async function fetchAllUsers() {
  try {
    const data = await makeRestCall();
    const users = data.prod_external_apps_user_data || data.user_data || data || [];
    
    console.log(`[Hasura API] Fetched ${users.length} users successfully`);
    return users;
  } catch (error) {
    console.error('[Hasura API] Failed to fetch users:', error.message);
    throw new Error(`Failed to fetch users from Hasura: ${error.message}`);
  }
}

/**
 * Transform Hasura API response to CRM database format
 * @param {Object} apiUser - User object from Hasura API
 * @returns {Object} Transformed user object for CRM database
 */
// in src/scripts/services/hasuraApiService.js
function transformUserData(apiUser) {
  try {
    const parseDate = (s) => (s ? new Date(s) : null);

    return {
      user_id: apiUser.user_id ?? null, // keep string like '499245.000000000'
      email: apiUser.email?.toLowerCase()?.trim() || null,
      user_login: apiUser.user_login?.toLowerCase()?.trim() || null,
      user_display_name: apiUser.user_display_name || null,
      user_role: apiUser.user_role || null,

      reporting_manager_user_id: apiUser.reporting_manager_user_id ?? null,
      reporting_manager_role_code: apiUser.reporting_manager_role_code || null,
      reporting_manager_user_login: apiUser.reporting_manager_user_login?.toLowerCase()?.trim() || null,

      city: apiUser.city || null,
      state: apiUser.state || null,
      center: apiUser.center || null,
      contact: apiUser.contact || null,
      added_by: apiUser.added_by || null,

      user_created_datetime: parseDate(apiUser.user_created_datetime),
      user_updated_datetime: parseDate(apiUser.user_updated_datetime),
    };
  } catch (error) {
    console.error(
      '[Hasura API] Error transforming user data:',
      error.message,
      `user_id: ${apiUser?.user_id}, email: ${apiUser?.email}`
    );
    throw new Error(`Failed to transform user data: ${error.message}`);
  }
}


/**
 * Health check for Hasura REST API connectivity
 * @returns {Promise<Object>} Health status
 */
async function healthCheck() {
  try {
    const startTime = Date.now();
    
    // Try to fetch data to test connectivity (API returns all data, no pagination)
    const data = await makeRestCall();
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const users = data.prod_user_data || data || [];
    
    return {
      status: 'healthy',
      responseTime,
      userCount: data.total_count || users.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Export all functions
module.exports = {
  fetchAllUsers,
  transformUserData,
  healthCheck
};