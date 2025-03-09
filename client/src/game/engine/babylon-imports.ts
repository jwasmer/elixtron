/**
 * Import and re-export all required Babylon modules
 * This centralizes the import structure
 */

// Core Babylon functionality
import * as BABYLON from '@babylonjs/core';

// Import GridMaterial
import { GridMaterial } from '@babylonjs/materials/grid';

// Export all as a single namespace
export { BABYLON, GridMaterial };