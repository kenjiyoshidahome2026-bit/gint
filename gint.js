/**
 * gint.js - Geospatial Intent Integer Primitive
 * * A 64-bit coordinate system that integrates topological integrity (L1),
 * resolution-adaptive culling (L2/VW-Rank), and spatial indexing (Morton).
 * * Copyright (c) 2026 [Kenji Yoshida / "The Veteran Engineer"]
 * Licensed under the MIT License.
 * * --------------------------------------------------------------------------
 * Developed in collaboration with Gemini (AI).
 * This code represents the fusion of veteran engineering wisdom with 
 * modern AI-driven optimization.
 * --------------------------------------------------------------------------
 */

class gint {
    // --- Constants ---
    static TERMINAL_BIT = 1n << 63n; // L1: 1 (Fixed), L2: 0 (Dynamic)
    static WEIGHT_MASK  = 0x3Fn;      // Lower 6 bits reserved for VW Weight (Rank 0-63)
    static SCALE_E      = 1e7;        // 10^-7 precision for base coordinates
    static INV_SCALE_E  = 1e-7;       // Pre-calculated inverse scale
    static RAD          = Math.PI / 180;

    /**
     * Packs [longitude, latitude] into an L1 (Terminal Node) gint.
     * L1 nodes maintain full 10^-7 precision and always persist across zoom levels.
     * @param {number[]} coords - [longitude, latitude]
     * @returns {bigint} 64-bit gint
     */
    static pack([lng, lat]) {
        const ix = Math.round((lng + 180) * this.SCALE_E);
        const iy = Math.round((lat + 90) * this.SCALE_E);
        return this._pureMortonFromInt(ix, iy) | this.TERMINAL_BIT;
    }

    /**
     * Packs raw 10^-7 integers into an L1 gint.
     */
    static packFromInt(ix, iy) {
        const xl = this._spread16(ix & 0xFFFF), xh = this._spread16((ix >>> 16) & 0xFFFF);
        const yl = this._spread16(iy & 0xFFFF), yh = this._spread16((iy >>> 16) & 0xFFFF);
        return ((BigInt((xh | (yh << 1)) >>> 0) << 32n) | BigInt((xl | (yl << 1)) >>> 0)) | this.TERMINAL_BIT;
    }

    /**
     * Unpacks a 64-bit gint back into raw 10^-7 integers.
     * Core of the topological restoration.
     * @param {bigint} m - 64-bit gint
     * @returns {number[]} [ix, iy] in 10^-7 precision
     */
    static unpackToInt(m) {
        const isL1 = (m & this.TERMINAL_BIT) !== 0n;
        // Logic: L1 preserves all bits. L2 masks out the 6-bit VW Weight.
        const morton = isL1 ? (m & ~this.TERMINAL_BIT) : (m & ~this.WEIGHT_MASK);
        
        const low32 = Number(morton & 0xFFFFFFFFn) >>> 0;
        const high32 = Number((morton >> 32n) & 0x7FFFFFFFn) >>> 0;
        
        const ix = ((this._compact16(high32) << 16) | this._compact16(low32)) >>> 0;
        const iy = ((this._compact16(high32 >>> 1) << 16) | this._compact16(low32 >>> 1)) >>> 0;
        return [ix, iy];
    }

    /**
     * Converts 10^-7 integers back to [longitude, latitude] floats.
     */
    static intToVal([ix, iy]) {
        return [(ix * this.INV_SCALE_E) - 180, (iy * this.INV_SCALE_E) - 90]
            .map(t => Number(t.toFixed(7)));
    }

    /**
     * Complete decoding from 64-bit gint to floating-point coordinates.
     */
    static unpack(m) {
        return this.intToVal(this.unpackToInt(m));
    }

    /**
     * Transforms an L1 node into an L2 (Intermediate Node) with a specific VW Rank.
     * Rounding to 8 units (2^3) clears 3 bits from both X and Y, creating a 
     * 6-bit gap in the Morton code to store the weight.
     * @param {bigint} L1 - Source L1 node
     * @param {number} weight - VW Rank (0-63)
     * @returns {bigint} 64-bit L2 gint
     */
    static toL2(L1, weight) {
        const [ix, iy] = this.unpackToInt(L1);
        // Round to 8 units for 10^-6 precision and 6-bit vacancy
        const rx = Math.round(ix / 8) * 8;
        const ry = Math.round(iy / 8) * 8;
        return (this._pureMortonFromInt(rx, ry) & ~this.WEIGHT_MASK) | BigInt(weight & 0x3F);
    }

    /**
     * Retrieves the weight (importance) of the gint.
     * L1 nodes are always returned as 63 (maximum importance).
     */
    static getWeight(m) {
        return (m & this.TERMINAL_BIT) !== 0n ? 63 : Number(m & this.WEIGHT_MASK);
    }

    // --- Private Morton Utilities (Z-Order Curve) ---

    static _pureMortonFromInt(ix, iy) {
        const xl = this._spread16(ix & 0xFFFF), xh = this._spread16((ix >>> 16) & 0xFFFF);
        const yl = this._spread16(iy & 0xFFFF), yh = this._spread16((iy >>> 16) & 0xFFFF);
        return (BigInt((xh | (yh << 1)) >>> 0) << 32n) | BigInt((xl | (yl << 1)) >>> 0);
    }

    static _spread16(x) {
        x = (x | (x << 8)) & 0x00FF00FF;
        x = (x | (x << 4)) & 0x0F0F0F0F;
        x = (x | (x << 2)) & 0x33333333;
        x = (x | (x << 1)) & 0x55555555;
        return x >>> 0;
    }

    static _compact16(m) {
        m &= 0x55555555;
        m = (m | (m >>> 1)) & 0x33333333;
        m = (m | (m >>> 2)) & 0x0F0F0F0F;
        m = (m | (m >>> 4)) & 0x00FF00FF;
        m = (m | (m >>> 8)) & 0x0000FFFF;
        return m & 0xFFFF;
    }
}
