export interface TontineGroup {
  id: string;
  name: string;
  initials: string;
  color: "green" | "blue" | "amber" | "purple" | "red";
  contributionAmount: number;
  frequency: string;
  currentRound: number;
  totalRounds: number;
  membersCount: number;
  maxMembers: number;
  penaltyRate: number;
  guaranteeDeposit: number;
  status: "active" | "pending" | "completed" | "full";
  totalPool: number;
  nextPayoutDays: number;
  contractAddress: string;
  minScore: number;
}

export interface GroupMember {
  id: string;
  name: string;
  initials: string;
  color: "green" | "blue" | "amber" | "purple";
  order: number;
  status: "paid" | "current" | "waiting";
  paidDate?: string;
}

export interface Transaction {
  id: string;
  type: "contribution" | "payout" | "contract" | "penalty" | "guarantee";
  name: string;
  date: string;
  hash: string;
  amount: number;
  groupName?: string;
}

export interface Notification {
  id: string;
  type: "payout" | "reminder" | "late" | "invitation" | "score";
  title: string;
  message: string;
  time: string;
  read: boolean;
  color: "green" | "amber" | "red" | "blue";
  navigateTo: string;
}

export const currentUser = {
  name: "Ama Kossou",
  initials: "AK",
  phone: "+229 01 02 03 04 05",
  did: "bitcoin:bc1q…treasury",
  score: 784,
  maxScore: 1000,
  groupsCount: 3,
  cyclesCompleted: 12,
  totalLocked: 375000,
};

export const myGroups: TontineGroup[] = [
  {
    id: "1",
    name: "Marché Dantokpa",
    initials: "MA",
    color: "green",
    contributionAmount: 50000,
    frequency: "Mensuelle",
    currentRound: 4,
    totalRounds: 10,
    membersCount: 10,
    maxMembers: 10,
    penaltyRate: 5,
    guaranteeDeposit: 50000,
    status: "active",
    totalPool: 500000,
    nextPayoutDays: 8,
    contractAddress: "0x8f3a...c92d",
    minScore: 300,
  },
  {
    id: "2",
    name: "Tontine Famille",
    initials: "TF",
    color: "blue",
    contributionAmount: 25000,
    frequency: "Mensuelle",
    currentRound: 2,
    totalRounds: 6,
    membersCount: 6,
    maxMembers: 6,
    penaltyRate: 3,
    guaranteeDeposit: 25000,
    status: "active",
    totalPool: 150000,
    nextPayoutDays: 22,
    contractAddress: "0x3b1d...f47a",
    minScore: 200,
  },
  {
    id: "3",
    name: "Zémidjan Cotonou",
    initials: "ZC",
    color: "purple",
    contributionAmount: 30000,
    frequency: "Mensuelle",
    currentRound: 1,
    totalRounds: 8,
    membersCount: 5,
    maxMembers: 8,
    penaltyRate: 5,
    guaranteeDeposit: 30000,
    status: "active",
    totalPool: 0,
    nextPayoutDays: 30,
    contractAddress: "0x7a3f...0019",
    minScore: 250,
  },
];

export const openGroups: TontineGroup[] = [
  {
    id: "4",
    name: "AdôGbè",
    initials: "GC",
    color: "amber",
    contributionAmount: 40000,
    frequency: "Mensuelle",
    currentRound: 0,
    totalRounds: 10,
    membersCount: 7,
    maxMembers: 10,
    penaltyRate: 5,
    guaranteeDeposit: 40000,
    status: "active",
    totalPool: 0,
    nextPayoutDays: 0,
    contractAddress: "0x4b2e...d91a",
    minScore: 300,
  },
  {
    id: "5",
    name: "Tontine Diaspora Paris",
    initials: "TD",
    color: "green",
    contributionAmount: 100000,
    frequency: "Mensuelle",
    currentRound: 0,
    totalRounds: 6,
    membersCount: 4,
    maxMembers: 6,
    penaltyRate: 3,
    guaranteeDeposit: 100000,
    status: "active",
    totalPool: 0,
    nextPayoutDays: 0,
    contractAddress: "0xc8e2...12b4",
    minScore: 500,
  },
  {
    id: "6",
    name: "Femmes du Marché",
    initials: "FM",
    color: "blue",
    contributionAmount: 25000,
    frequency: "Mensuelle",
    currentRound: 0,
    totalRounds: 12,
    membersCount: 9,
    maxMembers: 12,
    penaltyRate: 5,
    guaranteeDeposit: 25000,
    status: "active",
    totalPool: 0,
    nextPayoutDays: 0,
    contractAddress: "0x88f1...e99b",
    minScore: 200,
  },
  {
    id: "7",
    name: "Épargne Premium",
    initials: "EP",
    color: "purple",
    contributionAmount: 200000,
    frequency: "Mensuelle",
    currentRound: 0,
    totalRounds: 8,
    membersCount: 8,
    maxMembers: 8,
    penaltyRate: 10,
    guaranteeDeposit: 200000,
    status: "full",
    totalPool: 0,
    nextPayoutDays: 0,
    contractAddress: "0x9f2c...a8e1",
    minScore: 700,
  },
];

export const groupMembers: GroupMember[] = [
  { id: "1", name: "Ama Kossou", initials: "AK", color: "blue", order: 1, status: "paid", paidDate: "04 jan" },
  { id: "2", name: "Fatou Dossa", initials: "FD", color: "green", order: 2, status: "paid", paidDate: "05 jan" },
  { id: "3", name: "Rose Agbossou", initials: "RA", color: "amber", order: 3, status: "current" },
  { id: "4", name: "Mireille Ekué", initials: "ME", color: "purple", order: 4, status: "waiting" },
];

export const transactions: Transaction[] = [
  { id: "1", type: "payout", name: "Cagnotte reçue — Dantokpa", date: "15 jan", hash: "0x9f2c...a8e1", amount: 500000 },
  { id: "2", type: "contribution", name: "Cotisation — Dantokpa", date: "04 jan", hash: "0x3b1d...f47a", amount: -50020 },
  { id: "3", type: "contribution", name: "Cotisation — Famille", date: "01 jan", hash: "0xc8e2...12b4", amount: -25020 },
  { id: "4", type: "contract", name: "Contrat déployé — Dantokpa", date: "12 sept", hash: "0x7a3f...0019", amount: 0 },
  { id: "5", type: "payout", name: "Cagnotte reçue — Famille", date: "15 déc", hash: "0x4d9a...cc32", amount: 150000 },
  { id: "6", type: "contribution", name: "Cotisation — Dantokpa", date: "03 déc", hash: "0x88f1...e99b", amount: -50020 },
];

export const notifications: Notification[] = [
  { id: "1", type: "payout", title: "Cagnotte versée — 500 000 FCFA", message: "Votre tour est arrivé. Le contrat Dantokpa vient de vous verser 500 000 FCFA sur votre MTN MoMo.", time: "14:32", read: false, color: "green", navigateTo: "/confirmation" },
  { id: "2", type: "reminder", title: "Rappel cotisation — Famille", message: "Votre cotisation de 25 000 FCFA est due dans 3 jours. Pénalité 5% au-delà.", time: "09:15", read: false, color: "amber", navigateTo: "/cotiser" },
  { id: "3", type: "late", title: "Membre en retard — Dantokpa", message: "Amina K. n'a pas cotisé. Pénalité automatique appliquée par le contrat.", time: "Hier", read: false, color: "red", navigateTo: "/groupe/1" },
  { id: "4", type: "invitation", title: "Invitation reçue — Groupe Zémidjan", message: "Kofi Mensah vous invite à rejoindre sa tontine de 30 000 FCFA.", time: "Lun", read: true, color: "blue", navigateTo: "/rejoindre/3" },
  { id: "5", type: "score", title: "Score Gbè amélioré", message: "Félicitations ! Votre score passe à 784. Accès aux groupes premium débloqué.", time: "Dim", read: true, color: "green", navigateTo: "/score" },
];

export const scoreBreakdown = [
  { label: "Ponctualité", value: 92, weight: 40, color: "green" as const },
  { label: "Participation", value: 85, weight: 25, color: "blue" as const },
  { label: "Ancienneté", value: 70, weight: 20, color: "purple" as const },
  { label: "Fiabilité", value: 78, weight: 15, color: "amber" as const },
];

export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.abs(amount)) + " FCFA";
}

export function formatCompact(amount: number): string {
  if (Math.abs(amount) >= 1000000) return (amount / 1000000).toFixed(0) + "M";
  if (Math.abs(amount) >= 1000) return (amount / 1000).toFixed(0) + "k";
  return amount.toString();
}