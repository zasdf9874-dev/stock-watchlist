import { create } from 'zustand';

// Define the shape of our global memory
interface AppState {
  // Watchlist
  stocks: any[];
  setStocks: (stocks: any[]) => void;

  // Screener Results
  uptrendResults: any[];
  setUptrendResults: (results: any[]) => void;
  
  strongUptrendResults: any[];
  setStrongUptrendResults: (results: any[]) => void;
  
  downtrendResults: any[];
  setDowntrendResults: (results: any[]) => void;

  stockBuyResults: any[];
  setStockBuyResults: (results: any[]) => void;

  technicalResults: any[];
  setTechnicalResults: (results: any[]) => void;
}

// Create the actual vault
export const useStore = create<AppState>((set) => ({
  // Watchlist
  stocks: [],
  setStocks: (stocks) => set({ stocks }),

  // Screener Results (Default to empty arrays)
  uptrendResults: [],
  setUptrendResults: (results) => set({ uptrendResults: results }),

  strongUptrendResults: [],
  setStrongUptrendResults: (results) => set({ strongUptrendResults: results }),

  downtrendResults: [],
  setDowntrendResults: (results) => set({ downtrendResults: results }),

  stockBuyResults: [],
  setStockBuyResults: (results) => set({ stockBuyResults: results }),
  technicalResults: [],
  setTechnicalResults: (results) => set({ technicalResults: results }),
}));