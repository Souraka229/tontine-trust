import { supabase, isSupabaseConfigured } from "@/lib/supabase";

import { getTreasuryAddress } from "@/lib/bitcoinTreasury";

import { syncTreasuryOnChain } from "@/lib/bitcoinSync";

import {

  emptyPool,

  type BtcLiquidityPool,

  type BtcWallet,

  type BtcLedgerEntry,

} from "@/lib/bitcoinWallet";



type PoolRow = {

  tvl_fcfa: number;

  btc_reserve: number;

  sats_liquid: number;

  apy: number;

  contributors: number;

  treasury_address?: string | null;

  on_chain_sats?: number | null;

  internal_sats?: number | null;

  ln_sats?: number | null;

  btc_price_xof?: number | null;

  last_chain_sync?: string | null;

  updated_at?: string | null;

};



function rowToPool(row: PoolRow): BtcLiquidityPool {

  return {

    tvlFcfa: Number(row.tvl_fcfa),

    btcReserve: Number(row.btc_reserve),

    satsLiquid: Number(row.sats_liquid),

    apy: Number(row.apy),

    contributors: Number(row.contributors),

    treasuryAddress: row.treasury_address || getTreasuryAddress() || undefined,

    onChainSats: row.on_chain_sats != null ? Number(row.on_chain_sats) : 0,

    internalSats: row.internal_sats != null ? Number(row.internal_sats) : 0,
    lnSats: row.ln_sats != null ? Number(row.ln_sats) : 0,

    btcPriceXof: row.btc_price_xof != null ? Number(row.btc_price_xof) : undefined,

    lastUpdated: row.last_chain_sync ?? row.updated_at ?? new Date().toISOString(),

  };

}



export interface PublicStats {

  members_count: number;

  treasury_tvl_fcfa: number;

  treasury_btc_reserve: number;

  treasury_on_chain_sats?: number;

  treasury_ln_sats?: number;

  treasury_internal_sats?: number;

  treasury_sats_liquid?: number;

  treasury_apy: number;

  treasury_contributors: number;

}



export async function fetchPublicStats(): Promise<PublicStats | null> {

  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase.rpc("rpc_public_stats");

  if (error) {

    console.warn("[bitcoinRepository] rpc_public_stats:", error.message);

    return null;

  }

  return data as PublicStats;

}



export async function fetchBtcPool(opts?: { sync?: boolean }): Promise<BtcLiquidityPool> {

  if (!isSupabaseConfigured) return emptyPool();



  if (opts?.sync !== false) {

    try {

      await syncTreasuryOnChain();

    } catch {

      /* edge function peut ne pas être déployée */

    }

  }



  const treasuryAddress = getTreasuryAddress();

  const { data, error } = await supabase.from("btc_treasury_pool").select("*").eq("id", 1).maybeSingle();

  if (error) throw error;



  if (data) {

    const row = data as PoolRow;

    if (treasuryAddress && row.treasury_address !== treasuryAddress) {

      await supabase

        .from("btc_treasury_pool")

        .update({ treasury_address: treasuryAddress, updated_at: new Date().toISOString() })

        .eq("id", 1);

      row.treasury_address = treasuryAddress;

    }

    return rowToPool(row);

  }



  return emptyPool();

}



export const syncBtcPool = () => fetchBtcPool({ sync: true });



export async function fetchOnChainTxHistory(limit = 10) {

  const { data } = await supabase

    .from("btc_on_chain_txs")

    .select("txid, sats, confirmed_at")

    .order("confirmed_at", { ascending: false })

    .limit(limit);

  return data ?? [];

}



export async function fetchBtcWallet(profileId: string): Promise<BtcWallet | null> {

  if (!isSupabaseConfigured || !profileId) return null;

  const { data, error } = await supabase

    .from("btc_user_wallets")

    .select("*")

    .eq("profile_id", profileId)

    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  return {

    address: data.address,

    sats: Number(data.sats),

    stakedSats: Number(data.staked_sats),

    linkedAt: data.linked_at,

  };

}



export async function linkBtcWallet(): Promise<BtcWallet> {

  const { data, error } = await supabase.rpc("rpc_btc_link_wallet");

  if (error) throw error;

  const address = (data as { address?: string })?.address;

  if (!address) throw new Error("Échec liaison registre membre");

  const { data: user } = await supabase.auth.getUser();

  const profileId = user.user?.id;

  if (!profileId) throw new Error("Non authentifié");

  const wallet = await fetchBtcWallet(profileId);

  return wallet ?? { address, sats: 0, stakedSats: 0, linkedAt: new Date().toISOString() };

}



export async function buyBtcWithFcfa(fcfa: number, priceXof: number, idempotencyKey?: string) {

  const { data, error } = await supabase.rpc("rpc_btc_buy_fcfa", {

    p_fcfa: fcfa,

    p_price_xof: priceXof,

    p_idempotency_key: idempotencyKey ?? null,

  });

  if (error) throw error;

  const result = data as { sats?: number; fcfa?: number };

  return { sats: Number(result.sats ?? 0), fcfa: Number(result.fcfa ?? fcfa) };

}



export async function stakeBtcSats(sats: number, priceXof: number, idempotencyKey?: string) {

  const { data, error } = await supabase.rpc("rpc_btc_stake", {

    p_sats: sats,

    p_price_xof: priceXof,

    p_idempotency_key: idempotencyKey ?? null,

  });

  if (error) throw error;

  const result = data as { staked_sats?: number; fcfa_equiv?: number };

  return {

    staked_sats: Number(result.staked_sats ?? sats),

    fcfa_equiv: Number(result.fcfa_equiv ?? 0),

  };

}



export async function fetchLedger(profileId: string, limit = 10): Promise<BtcLedgerEntry[]> {

  const { data, error } = await supabase

    .from("btc_ledger")

    .select("id, entry_type, sats_delta, fcfa_amount, btc_price_xof, created_at")

    .eq("profile_id", profileId)

    .order("created_at", { ascending: false })

    .limit(limit);

  if (error) throw error;

  return (data ?? []) as BtcLedgerEntry[];

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

  const { error } = await supabase.from("bitcoin_commitments").insert({

    group_id: record.group_id ?? null,

    profile_id: record.profile_id ?? null,

    commitment_text: record.commitment_text,

    document_hash: record.document_hash,

    signature: record.signature,

    pubkey_hint: record.pubkey_hint ?? null,

    amount_fcfa: record.amount_fcfa ?? null,

  });

  if (error) throw error;

}



export async function fetchGroupCommitments(groupId: string): Promise<CommitmentRecord[]> {

  const { data } = await supabase

    .from("bitcoin_commitments")

    .select("*")

    .eq("group_id", groupId)

    .order("created_at", { ascending: false })

    .limit(5);

  return (data ?? []) as CommitmentRecord[];

}



export async function fetchMyCommitments(profileId: string): Promise<CommitmentRecord[]> {

  const { data } = await supabase

    .from("bitcoin_commitments")

    .select("*")

    .eq("profile_id", profileId)

    .order("created_at", { ascending: false })

    .limit(5);

  return (data ?? []) as CommitmentRecord[];

}



export const loadBtcWallet = fetchBtcWallet;

export const connectAndPersistWallet = linkBtcWallet;

export const persistBtcPool = async () => undefined;

export const persistBtcWallet = async () => undefined;


