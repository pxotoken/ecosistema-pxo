/**
 * PokeAPI Integration Service
 * Handles all interactions with PokeAPI
 */

import apiClient, { API_PROVIDERS } from '../../config/axios/index.js';
import type { PokemonData } from '@pxo/shared/types';

const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';

/**
 * Get Pokemon data by name or ID
 * @param nameOrId - Pokemon name or ID (e.g., 'ditto' or 132)
 * @returns Pokemon data
 */
export async function getPokemon(nameOrId: string | number): Promise<PokemonData> {
  const response = await apiClient.get<PokemonData>(
    `${POKEAPI_BASE_URL}/pokemon/${nameOrId}`,
    {
      provider: API_PROVIDERS.UNKNOWN,
    }
  );

  return response.data;
}

/**
 * Get Ditto's data specifically
 * @returns Ditto's Pokemon data
 */
export async function getDitto(): Promise<PokemonData> {
  return getPokemon('ditto');
}
