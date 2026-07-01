import { hashMessage, recoverMessageAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

/** Texte d'engagement tontinier signé ECDSA (courbe secp256k1, même famille que Bitcoin). */
export function generateCommitmentText(groupId: string, memberName: string, amountFcfa: number) {
  return `TontineChain · Je soussigné(e) ${memberName} m'engage à cotiser ${amountFcfa} FCFA dans le groupe ${groupId}.`;
}

export function hashCommitment(text: string): `0x${string}` {
  return hashMessage(text);
}

/** Signature secp256k1 — même courbe elliptique que Bitcoin (ECDSA). */
export async function signCommitment(commitmentHash: `0x${string}`) {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const signature = await account.signMessage({ message: { raw: commitmentHash } });
  return { signature, pubkeyHint: account.address };
}

export async function verifyCommitment(
  commitmentHash: `0x${string}`,
  signature: `0x${string}`,
  expectedPubkey: `0x${string}`
) {
  const recovered = await recoverMessageAddress({ message: { raw: commitmentHash }, signature });
  return recovered.toLowerCase() === expectedPubkey.toLowerCase();
}

/** Vérifie une preuve stockée en base (secp256k1). */
export async function verifyStoredCommitment(
  documentHash: string,
  signature: string,
  pubkeyHint: string,
): Promise<boolean> {
  if (!documentHash.startsWith("0x") || !signature.startsWith("0x") || !pubkeyHint.startsWith("0x")) {
    return false;
  }
  try {
    return await verifyCommitment(
      documentHash as `0x${string}`,
      signature as `0x${string}`,
      pubkeyHint as `0x${string}`,
    );
  } catch {
    return false;
  }
}
