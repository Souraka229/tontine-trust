import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { fetchOnChainTreasury, getTreasuryAddress } from "@/lib/bitcoinTreasury";
import {
  getBtcPool,
  saveBtcPool,
  getBtcWallet,
  connectBtcWallet,
  type BtcLiquidityPool,
  type BtcWallet,
} from "@/lib/bitcoinWallet";

type PoolRow = {
  tvl_fcfa: number;
  btc_reserve: number;
  sats_liquid: number;
  apy: number;
  contributors: number;
  treasury_address?: string | null;
  on_chain_sats?: number | null;
  last_chain_sync?: string | null;
};

function rowToPool(row: PoolRow): BtcLiquidityPool {
  return {
    tvlFcfa: Number(row.tvl_fcfa),
    btcReserve: Number(row.btc_reserve),
    satsLiquid: Number(row.sats_liquid),
    apy: Number(row.apy),
    contributors: Number(row.contributors),
    treasuryAddress: row.treasury_address ?? getTreasuryAddress(),
    onChainSats: row.on_chain_sats != null ? Number(row.on_chain_sats) : undefined,
    lastUpdated: row.last_chain_sync ?? new Date().toISOString(),
  };
}

/** Charge le trésor depuis Supabase + synchronise le solde on-chain (mempool.space). */
export async function syncBtcPool(): Promise<BtcLiquidityPool> {
  const onChain = await fetchOnChainTreasury();
  const treasuryAddress = getTreasuryAddress();

  if (!isSupabaseConfigured) {
    const local = saveBtcPool({
      treasuryAddress,
      onChainSats: onChain.balanceSats,
    });
    return local;
  }

  try {
    const { data, error } = await supabase.from("btc_treasury_pool").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;

    const patch = {
      treasury_address: treasuryAddress,
      on_chain_sats: onChain.balanceSats,
      last_chain_sync: onChain.syncedAt,
      updated_at: new Date().toISOString(),
    };

    if (data) {
      const pool = rowToPool({ ...(data as PoolRow), ...patch });
      saveBtcPool(pool);
      await supabase.from("btc_treasury_pool").update(patch).eq("id", 1);
      return getBtcPool();
    }

    const local = getBtcPool();
    await supabase.from("btc_treasury_pool").upsert({
      id: 1,
      tvl_fcfa: local.tvlFcfa,
      btc_reserve: local.btcReserve,
      sats_liquid: local.satsLiquid,
      apy: local.apy,
      contributors: local.contributors,
      ...patch,
    });
    saveBtcPool({ ...local, treasuryAddress, onChainSats: onChain.balanceSats });
    return getBtcPool();
  } catch {
    return saveBtcPool({ treasuryAddress, onChainSats: onChain.balanceSats });
  }
}

/** Persiste le pool local vers Supabase. */
export async function persistBtcPool(pool: BtcLiquidityPool): Promise<void> {
  saveBtcPool(pool);
  if (!isSupabaseConfigured) return;

  try {
    await supabase.from("btc_treasury_pool").upsert({
      id: 1,
      tvl_fcfa: pool.tvlFcfa,
      btc_reserve: pool.btcReserve,
      sats_liquid: pool.satsLiquid,
      apy: pool.apy,
      contributors: pool.contributors,
      treasury_address: pool.treasuryAddress ?? getTreasuryAddress(),
      on_chain_sats: pool.onChainSats ?? null,
      updated_at: new Date().toISOString(),
    });
  } catch {
    /* offline demo */
  }
}

export async function loadBtcWallet(profileId: string): Promise<BtcWallet | null> {
  const local = getBtcWallet();
  if (!isSupabaseConfigured || !profileId) return local;

  try {
    const { data } = await supabase
      .from("btc_user_wallets")
      .select("*")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (data) {
      const wallet: BtcWallet = {
        address: data.address,
        sats: Number(data.sats),
        stakedSats: Number(data.staked_sats),
        linkedAt: data.linked_at,
      };
      localStorage.setItem("tc_btc_wallet", JSON.stringify(wallet));
      return wallet;
    }
  } catch {
    /* ignore */
  }
  return local;
}

export async function persistBtcWallet(profileId: string, wallet: BtcWallet): Promise<void> {
  localStorage.setItem("tc_btc_wallet", JSON.stringify(wallet));
  if (!isSupabaseConfigured || !profileId) return;

  try {
    await supabase.from("btc_user_wallets").upsert({
      profile_id: profileId,
      address: wallet.address,
      sats: wallet.sats,
      staked_sats: wallet.stakedSats,
      linked_at: wallet.linkedAt,
      updated_at: new Date().toISOString(),
    });
  } catch {
    /* ignore */
  }
}

export async function connectAndPersistWallet(profileId?: string): Promise<BtcWallet> {
  const wallet = connectBtcWallet(profileId);
  if (profileId) await persistBtcWallet(profileId, wallet);
  return wallet;
}

export interface CommitmentRecord {
  id?: string;
  group_id?: string | null;
  profile_id?: string | null;
  commitment_text: string;
  document_hash: string;
  signature: string;
  pubkey_hint?: string | null;
  amount_fcfa?: number | null;
  created_at?: string;
}

export async function recordBitcoinCommitment(record: CommitmentRecord): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    await supabase.from("bitcoin_commitments").insert({
      group_id: record.group_id ?? null,
      profile_id: record.profile_id ?? null,
      commitment_text: record.commitment_text,
      document_hash: record.document_hash,
      signature: record.signature,
      pubkey_hint: record.pubkey_hint ?? null,
      amount_fcfa: record.amount_fcfa ?? null,
    });
  } catch (e) {
    console.warn("[bitcoinRepository] commitment insert failed", e);
  }
}

export async function fetchGroupCommitments(groupId: string): Promise<CommitmentRecord[]> {
  if (!isSupabaseConfigured) return [];

  const { data } = await supabase
    .from("bitcoin_commitments")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(5);

  return (data ?? []) as CommitmentRecord[];
}
