import { UserSession, Organization } from '../types';

interface LoginCredentials {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  session?: UserSession;
  user?: {
    id: string;
    name: string;
    role: string;
    enabled_modules?: string[];
  };
  organization?: {
    id: string;
    name: string;
    regionId: string;
    districtId: string;
    type: string;
    enabled_modules?: string[];
    login: string;
    center: {
      id: number;
      lat: number;
      lng: number;
    };
    created_at: string;
    region: string;
    district: string;
  };
  district?: {
    id: string;
    name: string;
    center: {
      lat: number;
      lng: number;
    };
  };
  region?: {
    id: string;
    name: string;
  };
  error?: string;
  token?: string;
}

class AuthService {
  private baseUrl: string = 'https://smartcityapi.aiproduct.uz/api';

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // Map frontend field names to backend field names
      const loginData = {
        login: credentials.username,
        password: credentials.password,
      };

      console.log('🔐 Sending login request to:', `${this.baseUrl}/auth/login/`);
      console.log('📤 Login data:', { login: loginData.login, password: '***' });

      // Get CSRF token first if needed
      const csrfToken = this.getCsrfToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      
      // Add CSRF token to headers if available
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      const response = await fetch(`${this.baseUrl}/auth/login/`, {
        method: 'POST',
        headers,
        credentials: 'include',  // Important for cookies/session
        body: JSON.stringify(loginData),
      });

      // Get the response text first
      const responseText = await response.text();

      // Try to parse the response as JSON
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error('❌ Failed to parse response as JSON:', e);
        return {
          success: false,
          error: 'Invalid response from server',
        };
      }

      if (!response.ok) {
        console.error('❌ Error response status:', response.status);
        console.error('❌ Error response data:', data);

        const errorMessage = data.message || data.detail || `HTTP ${response.status}: ${response.statusText}`;

        return {
          success: false,
          error: errorMessage,
        };
      }

      // If we get here, the request was successful
      console.log('✅ Login successful, data:', data);

      if (data.token) {
        // Store the token in localStorage
        this.setToken(data.token);
      }

      // Store organization ID in localStorage if available
      if (data.organization && data.organization.id) {
        localStorage.setItem('organizationId', data.organization.id);
      } else if (data.user && data.user.organizationId) {
        localStorage.setItem('organizationId', data.user.organizationId);
      }

      return {
        success: true,
        session: data.session,
        user: data.user,
        organization: data.organization,
        district: data.district,
        region: data.region,
        token: data.token,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Network error or server unavailable',
      };
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/validate/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        try {
          const data = await response.json();
          // Handle different possible response formats
          if (data.valid === true || data.detail === 'Valid token') {
            if (data.organization_id) {
              localStorage.setItem('organizationId', data.organization_id);
            }
            return true;
          }
        } catch (e) {
          console.error('Error parsing validation response:', e);
        }
      }
      return false;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  // Store token in localStorage
  setToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  // Get token from localStorage
  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  // Remove token from localStorage
  removeToken(): void {
    localStorage.removeItem('authToken');
  }
  
  // Get CSRF token from cookies
  getCsrfToken(): string | null {
    // Try to get CSRF token from cookies
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        // Does this cookie string begin with the name we want?
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }
}

export const authService = new AuthService();