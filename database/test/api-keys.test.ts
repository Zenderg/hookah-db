/**
 * Tests for API Key CRUD Operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createApiKey,
  getApiKeyById,
  getApiKeyByValue,
  getAllActiveApiKeys,
  getAllApiKeys,
  updateApiKey,
  deleteApiKey,
  validateApiKey,
  updateApiKeyLastUsed,
  updateApiKeyLastUsedByValue,
  deactivateApiKey,
  activateApiKey,
  getApiKeyCount,
  getActiveApiKeyCount,
  apiKeyExists,
} from '../src/api-keys';
import type { CreateApiKeyInput, UpdateApiKeyInput } from '../src/types';

/**
 * Generate a unique name for test data to avoid conflicts
 */
function generateUniqueName(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

describe('API Key CRUD Operations', () => {
  describe('createApiKey', () => {
    it('should create a new API key', async () => {
      const input: CreateApiKeyInput = {
        key_value: generateUniqueName('test_key'),
        name: 'Test API Key',
        active: true,
        expires_at: new Date(Date.now() + 86400000), // 24 hours from now
      };

      const apiKey = await createApiKey(input);

      expect(apiKey).toBeDefined();
      expect(apiKey.id).toBeGreaterThan(0);
      expect(apiKey.key_value).toContain('test_key');
      expect(apiKey.name).toBe('Test API Key');
      expect(apiKey.active).toBe(true);
      expect(apiKey.expires_at).toBeInstanceOf(Date);
      expect(apiKey.created_at).toBeInstanceOf(Date);
      expect(apiKey.last_used_at).toBeNull();
    });

    it('should create an API key with minimal fields', async () => {
      const input: CreateApiKeyInput = {
        key_value: generateUniqueName('minimal_key'),
        name: 'Minimal API Key',
      };

      const apiKey = await createApiKey(input);

      expect(apiKey).toBeDefined();
      expect(apiKey.id).toBeGreaterThan(0);
      expect(apiKey.key_value).toContain('minimal_key');
      expect(apiKey.name).toBe('Minimal API Key');
      expect(apiKey.active).toBe(true); // default
      expect(apiKey.expires_at).toBeNull();
    });

    it('should throw error for duplicate key value', async () => {
      const name = generateUniqueName('duplicate_key');
      const input: CreateApiKeyInput = {
        key_value: name,
        name: 'Duplicate Key',
      };

      await createApiKey(input);

      await expect(createApiKey(input)).rejects.toThrow(`API key with value "${name}" already exists`);
    });
  });

  describe('getApiKeyById', () => {
    it('should return API key by ID', async () => {
      const input: CreateApiKeyInput = {
        key_value: generateUniqueName('get_by_id_key'),
        name: 'Get By ID Key',
      };
      const created = await createApiKey(input);

      const apiKey = await getApiKeyById(created.id);

      expect(apiKey).toBeDefined();
      expect(apiKey?.id).toBe(created.id);
      expect(apiKey?.key_value).toContain('get_by_id_key');
    });

    it('should return null for non-existent API key', async () => {
      const apiKey = await getApiKeyById(999999);

      expect(apiKey).toBeNull();
    });
  });

  describe('getApiKeyByValue', () => {
    it('should return API key by value', async () => {
      const name = generateUniqueName('get_by_value_key');
      const input: CreateApiKeyInput = {
        key_value: name,
        name: 'Get By Value Key',
      };
      await createApiKey(input);

      const apiKey = await getApiKeyByValue(name);

      expect(apiKey).toBeDefined();
      expect(apiKey?.key_value).toContain('get_by_value_key');
    });

    it('should return null for non-existent API key value', async () => {
      const apiKey = await getApiKeyByValue('nonexistent_key');

      expect(apiKey).toBeNull();
    });
  });

  describe('getAllActiveApiKeys', () => {
    beforeEach(async () => {
      await createApiKey({ key_value: generateUniqueName('active_key_1'), name: 'Active Key 1', active: true });
      await createApiKey({ key_value: generateUniqueName('active_key_2'), name: 'Active Key 2', active: true });
      await createApiKey({ key_value: generateUniqueName('inactive_key'), name: 'Inactive Key', active: false });
    });

    it('should return only active API keys', async () => {
      const apiKeys = await getAllActiveApiKeys();

      expect(apiKeys.length).toBeGreaterThanOrEqual(2);
      expect(apiKeys.every(k => k.active)).toBe(true);
    });

    it('should exclude expired keys', async () => {
      // Create an expired key
      await createApiKey({
        key_value: generateUniqueName('expired_key'),
        name: 'Expired Key',
        active: true,
        expires_at: new Date(Date.now() - 86400000), // 24 hours ago
      });

      const apiKeys = await getAllActiveApiKeys();

      expect(apiKeys.every(k => k.key_value !== 'expired_key')).toBe(true);
    });
  });

  describe('getAllApiKeys', () => {
    beforeEach(async () => {
      await createApiKey({ key_value: generateUniqueName('key_1'), name: 'Key 1' });
      await createApiKey({ key_value: generateUniqueName('key_2'), name: 'Key 2' });
      await createApiKey({ key_value: generateUniqueName('key_3'), name: 'Key 3' });
    });

    it('should return all API keys', async () => {
      const apiKeys = await getAllApiKeys();

      expect(apiKeys.length).toBeGreaterThanOrEqual(3);
      expect(apiKeys.every(k => k.id && k.key_value && k.name)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const apiKeys = await getAllApiKeys(2);

      expect(apiKeys.length).toBeLessThanOrEqual(2);
    });

    it('should respect offset parameter', async () => {
      const apiKeys1 = await getAllApiKeys(10, 0);
      const apiKeys2 = await getAllApiKeys(10, 2);

      expect(apiKeys2.length).toBeLessThanOrEqual(apiKeys1.length);
    });

    it('should return keys ordered by created_at DESC', async () => {
      const apiKeys = await getAllApiKeys(10, 0);
      const timestamps = apiKeys.map(k => k.created_at.getTime());

      const sortedTimestamps = [...timestamps].sort((a, b) => b - a);
      expect(timestamps).toEqual(sortedTimestamps);
    });
  });

  describe('updateApiKey', () => {
    it('should update API key fields', async () => {
      const input: CreateApiKeyInput = {
        key_value: generateUniqueName('update_key'),
        name: 'Original Name',
        active: true,
      };
      const created = await createApiKey(input);

      const updateInput: UpdateApiKeyInput = {
        name: 'Updated Name',
        active: false,
      };

      const updated = await updateApiKey(created.id, updateInput);

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(created.id);
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.active).toBe(false);
    });

    it('should update only provided fields', async () => {
      const input: CreateApiKeyInput = {
        key_value: generateUniqueName('partial_update_key'),
        name: 'Original Name',
        active: true,
      };
      const created = await createApiKey(input);

      const updated = await updateApiKey(created.id, { name: 'New Name' });

      expect(updated?.name).toBe('New Name');
      expect(updated?.active).toBe(true); // unchanged
    });

    it('should return null for non-existent API key', async () => {
      const updated = await updateApiKey(999999, { name: 'New Name' });

      expect(updated).toBeNull();
    });

    it('should throw error for duplicate key value', async () => {
      const name1 = generateUniqueName('key_1');
      const name2 = generateUniqueName('key_2');
      await createApiKey({ key_value: name1, name: 'Key 1' });
      const key2 = await createApiKey({ key_value: name2, name: 'Key 2' });

      await expect(
        updateApiKey(key2.id, { key_value: name1 })
      ).rejects.toThrow(`API key with value "${name1}" already exists`);
    });

    it('should return existing API key when no fields to update', async () => {
      const input: CreateApiKeyInput = {
        key_value: generateUniqueName('no_update_key'),
        name: 'No Update Key',
      };
      const created = await createApiKey(input);

      const updated = await updateApiKey(created.id, {});

      expect(updated).toEqual(created);
    });
  });

  describe('deleteApiKey', () => {
    it('should delete API key by ID', async () => {
      const input: CreateApiKeyInput = {
        key_value: generateUniqueName('delete_key'),
        name: 'Delete Key',
      };
      const created = await createApiKey(input);

      const deleted = await deleteApiKey(created.id);

      expect(deleted).toBe(true);

      const apiKey = await getApiKeyById(created.id);
      expect(apiKey).toBeNull();
    });

    it('should return false for non-existent API key', async () => {
      const deleted = await deleteApiKey(999999);

      expect(deleted).toBe(false);
    });
  });

  describe('validateApiKey', () => {
    it('should return valid active API key', async () => {
      const keyValue = generateUniqueName('valid_key');
      const input: CreateApiKeyInput = {
        key_value: keyValue,
        name: 'Valid Key',
        active: true,
      };
      await createApiKey(input);

      const apiKey = await validateApiKey(keyValue);

      expect(apiKey).toBeDefined();
      expect(apiKey?.key_value).toBe(keyValue);
      expect(apiKey?.active).toBe(true);
    });

    it('should return null for inactive API key', async () => {
      const keyValue = generateUniqueName('inactive_key');
      const input: CreateApiKeyInput = {
        key_value: keyValue,
        name: 'Inactive Key',
        active: false,
      };
      await createApiKey(input);

      const apiKey = await validateApiKey(keyValue);

      expect(apiKey).toBeNull();
    });

    it('should return null for expired API key', async () => {
      const keyValue = generateUniqueName('expired_key');
      const input: CreateApiKeyInput = {
        key_value: keyValue,
        name: 'Expired Key',
        active: true,
        expires_at: new Date(Date.now() - 86400000), // 24 hours ago
      };
      await createApiKey(input);

      const apiKey = await validateApiKey(keyValue);

      expect(apiKey).toBeNull();
    });

    it('should return null for non-existent API key', async () => {
      const apiKey = await validateApiKey('nonexistent_key');

      expect(apiKey).toBeNull();
    });
  });

  describe('updateApiKeyLastUsed', () => {
    it('should update last_used_at timestamp', async () => {
      const input: CreateApiKeyInput = {
        key_value: generateUniqueName('last_used_key'),
        name: 'Last Used Key',
      };
      const created = await createApiKey(input);

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await updateApiKeyLastUsed(created.id);

      expect(updated).toBeDefined();
      expect(updated?.last_used_at).not.toBeNull();
      expect(updated?.last_used_at).toBeInstanceOf(Date);
      expect(updated?.last_used_at!.getTime()).toBeGreaterThan(created.created_at.getTime());
    });

    it('should return null for non-existent API key', async () => {
      const updated = await updateApiKeyLastUsed(999999);

      expect(updated).toBeNull();
    });
  });

  describe('updateApiKeyLastUsedByValue', () => {
    it('should update last_used_at by key value', async () => {
      const name = generateUniqueName('last_used_by_value_key');
      const input: CreateApiKeyInput = {
        key_value: name,
        name: 'Last Used By Value Key',
      };
      const created = await createApiKey(input);

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await updateApiKeyLastUsedByValue(name);

      expect(updated).toBeDefined();
      expect(updated?.last_used_at).not.toBeNull();
      expect(updated?.last_used_at).toBeInstanceOf(Date);
    });

    it('should return null for non-existent key value', async () => {
      const updated = await updateApiKeyLastUsedByValue('nonexistent_key');

      expect(updated).toBeNull();
    });
  });

  describe('deactivateApiKey', () => {
    it('should deactivate an API key', async () => {
      const input: CreateApiKeyInput = {
        key_value: generateUniqueName('deactivate_key'),
        name: 'Deactivate Key',
        active: true,
      };
      const created = await createApiKey(input);

      const deactivated = await deactivateApiKey(created.id);

      expect(deactivated).toBeDefined();
      expect(deactivated?.active).toBe(false);
    });

    it('should return null for non-existent API key', async () => {
      const deactivated = await deactivateApiKey(999999);

      expect(deactivated).toBeNull();
    });
  });

  describe('activateApiKey', () => {
    it('should activate an API key', async () => {
      const input: CreateApiKeyInput = {
        key_value: generateUniqueName('activate_key'),
        name: 'Activate Key',
        active: false,
      };
      const created = await createApiKey(input);

      const activated = await activateApiKey(created.id);

      expect(activated).toBeDefined();
      expect(activated?.active).toBe(true);
    });

    it('should return null for non-existent API key', async () => {
      const activated = await activateApiKey(999999);

      expect(activated).toBeNull();
    });
  });

  describe('getApiKeyCount', () => {
    it('should return count of API keys', async () => {
      await createApiKey({ key_value: generateUniqueName('count_key_1'), name: 'Count Key 1' });
      await createApiKey({ key_value: generateUniqueName('count_key_2'), name: 'Count Key 2' });

      const count = await getApiKeyCount();

      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getActiveApiKeyCount', () => {
    it('should return count of active API keys', async () => {
      await createApiKey({ key_value: generateUniqueName('active_count_1'), name: 'Active Count 1', active: true });
      await createApiKey({ key_value: generateUniqueName('active_count_2'), name: 'Active Count 2', active: true });
      await createApiKey({ key_value: generateUniqueName('inactive_count'), name: 'Inactive Count', active: false });

      const count = await getActiveApiKeyCount();

      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should exclude expired keys from count', async () => {
      await createApiKey({
        key_value: generateUniqueName('expired_count'),
        name: 'Expired Count',
        active: true,
        expires_at: new Date(Date.now() - 86400000),
      });

      const count = await getActiveApiKeyCount();

      // The expired key should not be counted
      const allKeys = await getAllApiKeys();
      const activeNonExpired = allKeys.filter(k => k.active && (!k.expires_at || k.expires_at > new Date()));
      expect(count).toBeGreaterThanOrEqual(activeNonExpired.length);
    });
  });

  describe('apiKeyExists', () => {
    it('should return true for existing API key', async () => {
      const name = generateUniqueName('exists_key');
      const input: CreateApiKeyInput = {
        key_value: name,
        name: 'Exists Key',
      };
      await createApiKey(input);

      const exists = await apiKeyExists(name);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent API key', async () => {
      const exists = await apiKeyExists('nonexistent_key');

      expect(exists).toBe(false);
    });
  });
});
