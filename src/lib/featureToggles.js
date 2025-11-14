import { supabase } from './supabase';

/**
 * Get boolean value for a named feature toggle.
 * @param {string} featureName
 * @returns {Promise<boolean>} true/false
 */
export async function getFeatureToggle(featureName) {
  const { data, error } = await supabase
    .from('customers')
    .select("company")
    .eq('name', "Milind Kumar")
    .single();

  if (error) throw error;
  return data.company;
}

/**
 * Set or upsert a feature toggle.
 * @param {string} featureName
 * @param {boolean} enabled
 * @returns {Promise<boolean>} resulting value of is_enabled
 */
export async function setFeatureToggle(featureName, enabled) {
  const { data, error } = await supabase
    .from('customers')
    .update({ company: enabled})
    .eq('name', "Milind Kumar")
    .select()
    .single();

  if (error) throw error;
  return Boolean(data?.is_enabled);
}