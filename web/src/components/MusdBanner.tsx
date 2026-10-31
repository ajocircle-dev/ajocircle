"use client";
import { useReadContracts } from "wagmi";
import { zeroAddress, type Address } from "viem";
import { ajoAbi } from "@/lib/abi";
import { ajoAddress, chainKey, explorerUrl } from "@/lib/config";
import { short } from "@/lib/format";

const ajo = { address: ajoAddress as Address, abi: ajoAbi } as const;

/** Reads the deployment's optional yield adapter. `null` adapter = plain token rails. */
export function useYieldConfig() {
  const { data } = useReadContracts({
    contracts: [
      { ...ajo, functionName: "yieldAdapter" },
      { ...ajo, functionName: "yieldAsset" },
    ],
    query: { enabled: !!ajoAddress, staleTime: 60_000 },
  });
  const adapter = data?.[0]?.result as Address | undefined;
  const asset = data?.[1]?.result as Address | undefined;
  return { adapter: adapter && adapter !== zeroAddress ? adapter : null, asset, loaded: !!data };
}

/** "Powered by MUSD" strip on the home page (Mezo deployments only). */
export function MusdBanner() {
  const { adapter, loaded } = useYieldConfig();
  if (chainKey !== "mezoTestnet" && chainKey !== "mezo") return null;
  return (
    <section className="card musd">
      <div>
        <strong>Powered by MUSD</strong>
        <p className="muted small">
          Every contribution, pot and collateral in AjoCircle on Mezo is MUSD: a dollar stablecoin borrowed against
          Bitcoin. Ajo savers get dollar rails backed by BTC, without leaving the savings habit they already have.
        </p>
      </div>
      <div className="musd-yield">
        <span className="muted small">Collateral yield (sMUSD)</span>
        {!loaded ? (
          <strong>…</strong>
        ) : adapter ? (
          <strong>
            On: MUSD Savings Vault via{" "}
            {explorerUrl ? (
              <a href={`${explorerUrl}/address/${adapter}`} target="_blank" rel="noreferrer">{short(adapter)}</a>
            ) : (
              short(adapter)
            )}
          </strong>
        ) : (
          <strong title="sMUSD works on Mezo testnet and mainnet. This deployment was built without an adapter wired in; a Wave 2 redeploy turns it on.">
            Off on this deployment (adapter not wired yet; sMUSD is live on testnet)
          </strong>
        )}
      </div>
    </section>
  );
}
