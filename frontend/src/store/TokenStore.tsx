import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FEATURES, type UserTokens, type FeatureTier } from "../lib/types";

const TOKEN_KEY = "smart-secretary:tokens:v1";

function loadTokens(): UserTokens {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (raw) return JSON.parse(raw) as UserTokens;
  } catch {
    /* ignore */
  }
  return { apiKey: undefined, balance: 0, lastSync: undefined };
}

interface Ctx extends UserTokens {
  hasPro: boolean;
  isLoading: boolean;
  error?: string;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  refreshBalance: () => Promise<void>;
  checkFeature: (featureId: string) => { allowed: boolean; tier: FeatureTier };
}

const TokenCtx = createContext<Ctx | null>(null);

export function TokenProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<UserTokens>(() => loadTokens());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  }, [tokens]);

  const setApiKey = useCallback((key: string) => {
    setTokens((t) => ({ ...t, apiKey: key.trim(), lastSync: new Date().toISOString() }));
    setError(undefined);
  }, []);

  const clearApiKey = useCallback(() => {
    setTokens({ apiKey: undefined, balance: 0, lastSync: undefined });
    setError(undefined);
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!tokens.apiKey) return;
    setIsLoading(true);
    setError(undefined);
    try {
      // Mock API call - replace with actual endpoint
      // const res = await fetch("https://llm.aipg.ir/api/v1/balance", {
      //   headers: { Authorization: `Bearer ${tokens.apiKey}` },
      // });
      // const data = await res.json();
      // setTokens((t) => ({ ...t, balance: data.balance }));
      
      // Mock response for demo
      await new Promise((r) => setTimeout(r, 600));
      const mockBalance = Math.floor(Math.random() * 50) + 10;
      setTokens((t) => ({ ...t, balance: mockBalance, lastSync: new Date().toISOString() }));
    } catch (e) {
      setError("ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsLoading(false);
    }
  }, [tokens.apiKey]);

  const checkFeature = useCallback(
    (featureId: string) => {
      const feature = FEATURES[featureId];
      if (!feature) return { allowed: true, tier: "free" as const };
      if (feature.tier === "free") return { allowed: true, tier: "free" as const };
      const hasToken = !!tokens.apiKey && (tokens.balance ?? 0) > 0;
      return { allowed: hasToken, tier: "pro" as const };
    },
    [tokens.apiKey, tokens.balance],
  );

  const hasPro = useMemo(() => !!tokens.apiKey && (tokens.balance ?? 0) > 0, [tokens.apiKey, tokens.balance]);

  const value = useMemo<Ctx>(
    () => ({
      ...tokens,
      hasPro,
      isLoading,
      error,
      setApiKey,
      clearApiKey,
      refreshBalance,
      checkFeature,
    }),
    [tokens, hasPro, isLoading, error, setApiKey, clearApiKey, refreshBalance, checkFeature],
  );

  return <TokenCtx.Provider value={value}>{children}</TokenCtx.Provider>;
}

export function useTokens() {
  const ctx = useContext(TokenCtx);
  if (!ctx) throw new Error("useTokens must be used within TokenProvider");
  return ctx;
}

export function useFeature(featureId: string) {
  const { checkFeature, hasPro } = useTokens();
  const result = checkFeature(featureId);
  return {
    allowed: result.allowed,
    tier: result.tier,
    isPro: result.tier === "pro",
    requiresUpgrade: !result.allowed && result.tier === "pro",
    hasPro,
  };
}
