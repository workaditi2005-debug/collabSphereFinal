import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../utils/api';
import { API_BASE_URL } from '../utils/constants';

/**
 * Custom hook for fetching data from API
 * @param {string} url - API endpoint
 * @param {object} options - Fetch options
 * @param {boolean} immediate - Whether to fetch immediately on mount
 * @returns {object} - { data, loading, error, refetch }
 */
export const useFetch = (url, options = {}, immediate = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const token = getAuthToken();
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, config);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Request failed');
      }

      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Fetch error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [fetchData, immediate]);

  return { data, loading, error, refetch: fetchData };
};

/**
 * Hook for POST requests
 * @param {string} url - API endpoint
 * @returns {object} - { execute, data, loading, error }
 */
export const usePost = (url) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async (body) => {
    setLoading(true);
    setError(null);

    const token = getAuthToken();
    
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Request failed');
      }

      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      console.error('POST error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { execute, data, loading, error };
};

/**
 * Hook for PUT/PATCH requests
 * @param {string} url - API endpoint
 * @param {string} method - HTTP method (PUT or PATCH)
 * @returns {object} - { execute, data, loading, error }
 */
export const useUpdate = (url, method = 'PUT') => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async (body) => {
    setLoading(true);
    setError(null);

    const token = getAuthToken();
    
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Request failed');
      }

      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      console.error('UPDATE error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { execute, data, loading, error };
};

/**
 * Hook for DELETE requests
 * @param {string} url - API endpoint
 * @returns {object} - { execute, data, loading, error }
 */
export const useDelete = (url) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async () => {
    setLoading(true);
    setError(null);

    const token = getAuthToken();
    
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Request failed');
      }

      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      console.error('DELETE error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { execute, data, loading, error };
};

/**
 * Hook for handling multiple API states
 * @returns {object} - API state management utilities
 */
export const useApiState = () => {
  const [states, setStates] = useState({});

  const setApiState = (key, state) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], ...state }
    }));
  };

  const getApiState = (key) => {
    return states[key] || { loading: false, error: null, data: null };
  };

  const resetApiState = (key) => {
    setStates(prev => {
      const newStates = { ...prev };
      delete newStates[key];
      return newStates;
    });
  };

  return { states, setApiState, getApiState, resetApiState };
};

export default useFetch;