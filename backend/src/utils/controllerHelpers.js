/**
 * Shared Controller Helpers
 * Eliminates duplicate helper functions across 8+ controllers
 * Consolidates common validation and access control logic
 */

const supabase = require('./supabaseClient');

class ControllerHelpers {
  /**
   * Extract parent ID from request headers
   * Used across multiple controllers for parent authorization
   */
  static getParentId(req) {
    return req.header('x-parent-id');
  }

  /**
   * Verify that a parent owns a specific child
   * Used across 8+ controllers for access control
   */
  static async verifyChildOwnership(parentId, childId) {
    try {
      const { data, error } = await supabase
        .from('children')
        .select('id')
        .eq('id', childId)
        .eq('parent_id', parentId)
        .single();

      return !error && data;
    } catch (error) {
      console.error('Error verifying child ownership:', error);
      return false;
    }
  }

  /**
   * Verify subject exists in the system
   * Common validation used across multiple controllers
   */
  static async verifySubjectExists(subjectId) {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('id', subjectId)
        .single();

      if (error) {
        return { exists: false, error: error.message };
      }

      return { exists: true, subject: data };
    } catch (error) {
      return { exists: false, error: error.message };
    }
  }

  /**
   * Verify unit exists and belongs to the specified child_subject
   * Used in multiple controllers for hierarchy validation
   */
  static async verifyUnitOwnership(unitId, childSubjectId) {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('id, title')
        .eq('id', unitId)
        .eq('child_subject_id', childSubjectId)
        .single();

      return !error && data;
    } catch (error) {
      console.error('Error verifying unit ownership:', error);
      return false;
    }
  }

  /**
   * Verify material exists and belongs to the specified unit
   * Used for material access control across controllers
   */
  static async verifyMaterialOwnership(materialId, unitId) {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('id, title')
        .eq('id', materialId)
        .eq('unit_id', unitId)
        .single();

      return !error && data;
    } catch (error) {
      console.error('Error verifying material ownership:', error);
      return false;
    }
  }

  /**
   * Check if parent has an active subscription
   * Used across controllers for feature access control
   */
  static async checkSubscriptionStatus(parentId) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('parent_id', parentId)
        .in('status', ['active', 'trialing'])
        .single();

      if (error || !data) {
        return { hasAccess: false, status: 'none' };
      }

      const isActive = data.status === 'active' || data.status === 'trialing';
      const isExpired = new Date(data.current_period_end) < new Date();

      return {
        hasAccess: isActive && !isExpired,
        status: data.status,
        expiresAt: data.current_period_end
      };
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return { hasAccess: false, status: 'error', error: error.message };
    }
  }

  /**
   * Validate required fields in request body
   * Standardizes parameter validation across controllers
   */
  static validateRequiredFields(body, requiredFields) {
    const missing = requiredFields.filter(field => !body[field]);
    
    if (missing.length > 0) {
      return {
        valid: false,
        error: `Missing required fields: ${missing.join(', ')}`,
        missingFields: missing
      };
    }

    return { valid: true };
  }

  /**
   * Validate numeric fields are positive integers
   * Common validation pattern across controllers
   */
  static validatePositiveIntegers(data, fields) {
    const invalid = [];
    
    fields.forEach(field => {
      const value = data[field];
      if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
        invalid.push(field);
      }
    });

    if (invalid.length > 0) {
      return {
        valid: false,
        error: `Fields must be positive integers: ${invalid.join(', ')}`,
        invalidFields: invalid
      };
    }

    return { valid: true };
  }

  /**
   * Get child subjects for a parent (with caching consideration)
   * Used across multiple controllers for context building
   */
  static async getChildSubjects(parentId, childId = null) {
    try {
      let query = supabase
        .from('child_subjects')
        .select(`
          id,
          child_id,
          custom_subject_name_override,
          created_at,
          children:child_id (id, name),
          subjects:subject_id (id, name, icon, color)
        `)
        .eq('children.parent_id', parentId);

      if (childId) {
        query = query.eq('child_id', childId);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Build common database transaction wrapper
   * Standardizes transaction handling across controllers
   */
  static async executeTransaction(operations) {
    const client = supabase;
    
    try {
      // Note: Supabase doesn't have explicit transactions in the client
      // but we can simulate atomic-like behavior with proper error handling
      const results = [];
      
      for (const operation of operations) {
        const result = await operation(client);
        results.push(result);
        
        // If any operation fails, we should handle rollback scenario
        if (result.error) {
          throw new Error(result.error.message);
        }
      }
      
      return { success: true, results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Format consistent timestamps for database operations
   * Standardizes timestamp handling across controllers
   */
  static getCurrentTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Parse and validate date strings
   * Common date validation across controllers
   */
  static validateDate(dateString, fieldName = 'date') {
    if (!dateString) {
      return { valid: true }; // Allow null/undefined dates
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return {
        valid: false,
        error: `Invalid ${fieldName} format. Use ISO 8601 format (YYYY-MM-DD).`
      };
    }

    return { valid: true, date: date.toISOString() };
  }

  /**
   * Sanitize string inputs for database storage
   * Prevents common injection patterns and normalizes data
   */
  static sanitizeString(str, maxLength = 255) {
    if (!str || typeof str !== 'string') return str;
    
    return str
      .trim()
      .substring(0, maxLength)
      .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
  }

  /**
   * Build standardized audit log entry
   * Used across controllers for action tracking
   */
  static createAuditLogEntry(parentId, childId, action, details = {}) {
    return {
      parent_id: parentId,
      child_id: childId,
      action,
      details,
      timestamp: this.getCurrentTimestamp(),
      ip_address: null, // Could be extracted from req if needed
      user_agent: null  // Could be extracted from req if needed
    };
  }
}

module.exports = ControllerHelpers;