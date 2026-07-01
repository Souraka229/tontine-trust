-- TONTINE TRUST — SCHÉMA SUPABASE COMPLET & PROFESSIONNEL
-- Version : 2.0
-- Idempotent : ré-exécutable sans erreur (DROP IF EXISTS / CREATE OR REPLACE)
-- Ordre d'exécution : Extensions → Types → Tables → Index → RLS → Fonctions → Triggers
-- ============================================================================

-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- pour les recherches textuelles futures


-- ============================================================================
-- 1. TYPES ÉNUMÉRÉS (domaine métier clairement défini)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE public.group_status      AS ENUM ('pending', 'active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.group_frequency   AS ENUM ('Journalier', 'Hebdomadaire', 'Bimensuelle', 'Mensuelle', 'Trimestrielle');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ajout idempotent si la valeur n'existe pas encore (migration safe)
DO $$ BEGIN
    ALTER TYPE public.group_frequency ADD VALUE IF NOT EXISTS 'Journalier' BEFORE 'Hebdomadaire';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.group_order_type  AS ENUM ('vrf', 'manual', 'random', 'score_based');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.member_status     AS ENUM ('waiting', 'paid', 'late', 'excluded', 'deceased');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.member_role       AS ENUM ('admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.guarantee_status  AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.guarantee_type    AS ENUM ('money', 'bank', 'property', 'life_insurance');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.transaction_type  AS ENUM (
        'deposit', 'withdrawal', 'contribution', 'payout', 'penalty', 'guarantee', 'refund'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_status    AS ENUM (
        'pending', 'success', 'failed', 'cancelled',
        'simulated_success', 'wallet_transfer'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.notification_color AS ENUM ('blue', 'green', 'orange', 'red', 'purple');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 2. TABLE : profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id                    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email                 TEXT        NOT NULL,
    name                  TEXT        NOT NULL DEFAULT '',
    initials              TEXT        NOT NULL DEFAULT '',
    phone                 TEXT        DEFAULT NULL,

    -- Financier
    wallet_balance        NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (wallet_balance >= 0),
    total_locked          NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_locked >= 0),

    -- Score de confiance (0–1000)
    score                 INTEGER     NOT NULL DEFAULT 500 CHECK (score BETWEEN 0 AND 1000),
    max_score             INTEGER     NOT NULL DEFAULT 1000,

    -- Statistiques
    groups_count          INTEGER     NOT NULL DEFAULT 0 CHECK (groups_count >= 0),
    cycles_completed      INTEGER     NOT NULL DEFAULT 0 CHECK (cycles_completed >= 0),

    -- Intégration TalyPay
    talypay_customer_id   TEXT        DEFAULT NULL,

    -- Horodatage
    created_at            TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

    CONSTRAINT profiles_email_key UNIQUE (email)
);

-- Migration safe : colonnes ajoutées si absentes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone               TEXT        DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS talypay_customer_id TEXT        DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_locked        NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS groups_count        INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cycles_completed    INTEGER     NOT NULL DEFAULT 0;

-- Contrainte UNIQUE email (si absente)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
END $$;

-- Contrainte CHECK sur le score (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_score_range' AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_score_range CHECK (score BETWEEN 0 AND 1000);
    END IF;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_score ON public.profiles (score DESC);


-- ============================================================================
-- 3. TABLE : groups
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.groups (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  TEXT        NOT NULL CHECK (char_length(trim(name)) > 0),
    initials              TEXT        NOT NULL DEFAULT '',
    color                 TEXT        NOT NULL DEFAULT 'green',

    -- Paramètres financiers
    contribution_amount   NUMERIC(15,2) NOT NULL CHECK (contribution_amount > 0),
    guarantee_deposit     NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (guarantee_deposit >= 0),
    penalty_rate          NUMERIC(5,2)  NOT NULL DEFAULT 5  CHECK (penalty_rate BETWEEN 0 AND 100),

    -- Paramètres opérationnels
    frequency             public.group_frequency   NOT NULL DEFAULT 'Mensuelle',
    order_type            public.group_order_type  NOT NULL DEFAULT 'vrf',
    status                public.group_status      NOT NULL DEFAULT 'pending',

    -- Rounds
    current_round         INTEGER     NOT NULL DEFAULT 0 CHECK (current_round >= 0),
    total_rounds          INTEGER     NOT NULL            CHECK (total_rounds > 0),
    max_members           INTEGER     NOT NULL            CHECK (max_members > 0),
    members_count         INTEGER     NOT NULL DEFAULT 0 CHECK (members_count >= 0),
    min_score             INTEGER     NOT NULL DEFAULT 0 CHECK (min_score BETWEEN 0 AND 1000),

    -- Pool & calendrier
    total_pool            NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_pool >= 0),
    next_payout_date      TIMESTAMPTZ DEFAULT NULL,

    -- Création
    created_by            UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

    CONSTRAINT groups_members_lte_rounds CHECK (max_members >= total_rounds)
);

-- Migration safe
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS guarantee_deposit  NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS min_score          INTEGER       NOT NULL DEFAULT 0;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS next_payout_date   TIMESTAMPTZ   DEFAULT NULL;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS cotisation_deadline_at TIMESTAMPTZ DEFAULT NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_groups_status     ON public.groups (status);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups (created_by);


-- ============================================================================
-- 4. TABLE : group_members
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.group_members (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id          UUID        NOT NULL REFERENCES public.groups(id)   ON DELETE CASCADE,
    profile_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Rôle & statut
    role              public.member_role      NOT NULL DEFAULT 'member',
    status            public.member_status    NOT NULL DEFAULT 'waiting',

    -- Ordre de tour
    turn_order        INTEGER     DEFAULT NULL CHECK (turn_order > 0),

    -- Garantie
    guarantee_type    public.guarantee_type   NOT NULL DEFAULT 'money',
    guarantee_proof   TEXT        DEFAULT NULL,
    guarantee_status  public.guarantee_status NOT NULL DEFAULT 'pending',

    -- Paiement du cycle courant
    paid_date         TIMESTAMPTZ DEFAULT NULL,

    -- Dates
    joined_at         TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

    CONSTRAINT group_members_unique UNIQUE (group_id, profile_id)
);

-- Migration safe
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS guarantee_type   TEXT DEFAULT 'money';
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS guarantee_proof  TEXT DEFAULT NULL;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS guarantee_status TEXT DEFAULT 'pending';
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS paid_date        TIMESTAMPTZ DEFAULT NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_group_members_group   ON public.group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_profile ON public.group_members (profile_id);
CREATE INDEX IF NOT EXISTS idx_group_members_status  ON public.group_members (group_id, status);

-- ============================================================================
-- 5. TABLE : transactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_id            UUID        REFERENCES public.groups(id) ON DELETE SET NULL,

    type                public.transaction_type NOT NULL,
    name                TEXT        NOT NULL CHECK (char_length(trim(name)) > 0),
    amount              NUMERIC(15,2) NOT NULL,  -- positif = crédit, négatif = débit

    -- Statut du paiement
    talypay_status      public.payment_status DEFAULT NULL,
    talypay_reference   TEXT        DEFAULT NULL,
    customer_phone      TEXT        DEFAULT NULL,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Migration safe
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS talypay_status    TEXT DEFAULT NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS talypay_reference TEXT DEFAULT NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS customer_phone    TEXT DEFAULT NULL;

-- ✅ Ajout requis pour corriger l’erreur
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());

-- Index
CREATE INDEX IF NOT EXISTS idx_transactions_profile    ON public.transactions (profile_id);
CREATE INDEX IF NOT EXISTS idx_transactions_group      ON public.transactions (group_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type       ON public.transactions (type);
CREATE INDEX IF NOT EXISTS idx_transactions_status     ON public.transactions (talypay_status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions (created_at DESC);


-- ============================================================================
-- 6. TABLE : notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    type        TEXT        NOT NULL,
    title       TEXT        NOT NULL CHECK (char_length(trim(title)) > 0),
    message     TEXT        NOT NULL,
    is_read     BOOLEAN     NOT NULL DEFAULT false,
    color       public.notification_color NOT NULL DEFAULT 'blue',
    navigate_to TEXT        NOT NULL DEFAULT '/home',

    created_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Index
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON public.notifications (profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON public.notifications (profile_id) WHERE is_read = false;


-- ============================================================================
-- 7. TABLE : payment_requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_requests (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    transaction_id  UUID        REFERENCES public.transactions(id) ON DELETE SET NULL,

    talypay_ref     TEXT        DEFAULT NULL,
    amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    currency        TEXT        NOT NULL DEFAULT 'XOF',
    customer_phone  TEXT        NOT NULL CHECK (char_length(trim(customer_phone)) > 0),
    operator        TEXT        DEFAULT NULL,

    status          public.payment_status NOT NULL DEFAULT 'pending',
    api_response    JSONB       DEFAULT NULL,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Index
CREATE INDEX IF NOT EXISTS idx_payment_requests_profile ON public.payment_requests (profile_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status  ON public.payment_requests (status);


-- ============================================================================
-- 7b. TABLE : payout_requests (Reconnaissance de dette et paiement)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payout_requests (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    member_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    document_hash   TEXT        NOT NULL,
    signature       TEXT        DEFAULT NULL,
    creator_approved BOOLEAN    NOT NULL DEFAULT false,
    
    status          TEXT        NOT NULL DEFAULT 'pending_signature', -- pending_signature, pending_approval, approved
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_group ON public.payout_requests (group_id);

-- ============================================================================
-- 7c. TABLE : group_invitations (Liens privés pour rejoindre)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.group_invitations (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    token           TEXT        NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_group_invitations_token ON public.group_invitations (token);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payout_requests_select" ON public.payout_requests FOR SELECT USING (true);
CREATE POLICY "payout_requests_insert" ON public.payout_requests FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "payout_requests_update" ON public.payout_requests FOR UPDATE USING (auth.role() = 'authenticated');

ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_invitations_select" ON public.group_invitations FOR SELECT USING (true);
CREATE POLICY "group_invitations_insert" ON public.group_invitations FOR INSERT WITH CHECK (auth.role() = 'authenticated');



-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- ── profiles ─────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;
-- Anciens noms éventuels
DROP POLICY IF EXISTS "Users can view their own profile."   ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by members of same group." ON public.profiles;

CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
    ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);


-- ── groups ───────────────────────────────────────────────────────────────────
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groups_select_all"    ON public.groups;
DROP POLICY IF EXISTS "groups_insert_auth"   ON public.groups;
DROP POLICY IF EXISTS "groups_update_owner"  ON public.groups;
DROP POLICY IF EXISTS "Anyone can view groups."                ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can create groups." ON public.groups;
DROP POLICY IF EXISTS "Group creator can update the group."    ON public.groups;

CREATE POLICY "groups_select_all"
    ON public.groups FOR SELECT USING (
        auth.uid() = created_by 
        OR 
        EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE group_members.group_id = groups.id 
            AND group_members.profile_id = auth.uid()
        )
    );

CREATE POLICY "groups_insert_auth"
    ON public.groups FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "groups_update_owner"
    ON public.groups FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "groups_delete_own"
    ON public.groups FOR DELETE
    USING (auth.uid() = created_by);


-- ── group_members ─────────────────────────────────────────────────────────────
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gm_select_all"        ON public.group_members;
DROP POLICY IF EXISTS "gm_insert_auth"       ON public.group_members;
DROP POLICY IF EXISTS "gm_update_own"        ON public.group_members;
DROP POLICY IF EXISTS "Users can view group members of their groups." ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups."                        ON public.group_members;
DROP POLICY IF EXISTS "Members can update their own status."          ON public.group_members;

CREATE POLICY "gm_select_all"
    ON public.group_members FOR SELECT USING (true);

CREATE POLICY "gm_insert_auth"
    ON public.group_members FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "gm_update_own"
    ON public.group_members FOR UPDATE
    USING (auth.uid() = profile_id)
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "gm_admin_update"
    ON public.group_members FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_id = group_members.group_id
              AND profile_id = auth.uid()
              AND role = 'admin'
        )
    );


-- ── transactions ──────────────────────────────────────────────────────────────
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tx_select_own"  ON public.transactions;
DROP POLICY IF EXISTS "tx_insert_own"  ON public.transactions;
DROP POLICY IF EXISTS "Users can view their own transactions."     ON public.transactions;
DROP POLICY IF EXISTS "Authenticated users can insert transactions." ON public.transactions;

CREATE POLICY "tx_select_own"
    ON public.transactions FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "tx_insert_own"
    ON public.transactions FOR INSERT WITH CHECK (auth.uid() = profile_id);


-- ── notifications ─────────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select_own"  ON public.notifications;
DROP POLICY IF EXISTS "notif_update_own"  ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications."   ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications." ON public.notifications;

CREATE POLICY "notif_select_own"
    ON public.notifications FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "notif_update_own"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = profile_id)
    WITH CHECK (auth.uid() = profile_id);


-- ── payment_requests ──────────────────────────────────────────────────────────
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pr_select_own"   ON public.payment_requests;
DROP POLICY IF EXISTS "pr_insert_own"   ON public.payment_requests;
DROP POLICY IF EXISTS "Users can view their own payment requests."        ON public.payment_requests;
DROP POLICY IF EXISTS "Authenticated users can create payment requests."  ON public.payment_requests;

CREATE POLICY "pr_select_own"
    ON public.payment_requests FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "pr_insert_own"
    ON public.payment_requests FOR INSERT WITH CHECK (auth.uid() = profile_id);


-- ============================================================================
-- 9. FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction générique updated_at
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := timezone('utc', now());
    RETURN NEW;
END;
$$;


-- ============================================================================
-- 10. FONCTION : Création du profil à l'inscription
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_name     TEXT;
    v_initials TEXT;
    v_phone    TEXT;
BEGIN
    -- Nom : metadata ou partie locale de l'email
    v_name := COALESCE(
        NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
        split_part(NEW.email, '@', 1)
    );

    -- Initiales : première lettre du prénom + première lettre du nom de famille
    v_initials :=
        UPPER(LEFT(v_name, 1))
        || COALESCE(
            UPPER(LEFT(NULLIF(trim(split_part(regexp_replace(v_name, '\s+', ' ', 'g'), ' ', 2)), ''), 1)),
            ''
        );

    -- Téléphone depuis metadata
    v_phone := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');

    -- Suppression des profils orphelins (email identique, id différent)
    DELETE FROM public.profiles
    WHERE email = NEW.email AND id <> NEW.id;

    -- Upsert du profil
    INSERT INTO public.profiles (id, email, name, initials, phone, wallet_balance, score)
    VALUES (NEW.id, NEW.email, v_name, v_initials, v_phone, 0, 500)
    ON CONFLICT (id) DO UPDATE SET
        email      = EXCLUDED.email,
        name       = EXCLUDED.name,
        initials   = EXCLUDED.initials,
        phone      = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = timezone('utc', now());

    -- Notification de bienvenue (une seule fois)
    INSERT INTO public.notifications (profile_id, type, title, message, color, navigate_to)
    SELECT
        NEW.id,
        'welcome',
        'Bienvenue sur TontineTrust ! 🛡️',
        'Votre compte est sécurisé sur TontineChain. Score de départ : 500 points.',
        'green',
        '/home'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE profile_id = NEW.id AND type = 'welcome'
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- On laisse l'inscription auth.users se terminer même en cas d'erreur
    RAISE WARNING '[handle_new_user] Erreur pour uid=% : %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


-- ============================================================================
-- 10b. INTERVALLE selon la fréquence du groupe (échéances cotisation)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_freq_interval(f public.group_frequency)
RETURNS interval
LANGUAGE sql
IMMUTABLE AS $$
    SELECT CASE f::text
        WHEN 'Journalier'    THEN interval '1 day'
        WHEN 'Hebdomadaire'  THEN interval '7 days'
        WHEN 'Bimensuelle'   THEN interval '14 days'
        WHEN 'Mensuelle'     THEN interval '30 days'
        WHEN 'Trimestrielle' THEN interval '90 days'
        ELSE interval '1 day'
    END;
$$;


-- ============================================================================
-- 11. FONCTION : Mise à jour du compteur de membres d'un groupe
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_update_group_members_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.groups
        SET members_count = members_count + 1
        WHERE id = NEW.group_id;

        -- Passer le groupe en 'active' si le quota est atteint (1er tour + échéances)
        UPDATE public.groups g
        SET
            status = 'active',
            current_round = CASE WHEN g.current_round = 0 THEN 1 ELSE g.current_round END,
            cotisation_deadline_at = CASE
                WHEN g.cotisation_deadline_at IS NULL THEN timezone('utc', now()) + public.fn_freq_interval(g.frequency)
                ELSE g.cotisation_deadline_at
            END,
            next_payout_date = CASE
                WHEN g.next_payout_date IS NULL THEN timezone('utc', now()) + public.fn_freq_interval(g.frequency)
                ELSE g.next_payout_date
            END
        WHERE g.id = NEW.group_id
          AND g.status = 'pending'
          AND g.members_count >= g.max_members;

        -- Si l'ordre est aléatoire, tirer au sort les tours lorsque le groupe devient actif.
        IF EXISTS (
            SELECT 1 FROM public.groups
            WHERE id = NEW.group_id
              AND order_type IN ('random', 'vrf')
              AND status = 'active'
        ) THEN
            UPDATE public.group_members gm
            SET turn_order = s.rn
            FROM (
                SELECT id, ROW_NUMBER() OVER (ORDER BY random()) AS rn
                FROM public.group_members
                WHERE group_id = NEW.group_id
            ) AS s
            WHERE gm.id = s.id;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.groups
        SET members_count = GREATEST(members_count - 1, 0)
        WHERE id = OLD.group_id;
    END IF;
    RETURN NULL;
END;
$$;


-- ============================================================================
-- 12. FONCTION : Effet d'une transaction sur le profil
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_update_profile_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_success BOOLEAN;
    v_abs     NUMERIC;
BEGIN
    -- Statuts considérés comme "réussis"
    v_success := NEW.talypay_status IN (
        'success', 'simulated_success', 'wallet_transfer'
    );

    IF NOT v_success THEN
        RETURN NEW;
    END IF;

    v_abs := ABS(NEW.amount);

    CASE NEW.type::TEXT
        WHEN 'payout' THEN
            -- Réception du pot : crédit wallet + déblocage + cycle ++
            IF NEW.amount > 0 THEN
                UPDATE public.profiles
                SET wallet_balance  = wallet_balance + NEW.amount,
                    total_locked    = GREATEST(total_locked - NEW.amount, 0),
                    cycles_completed = cycles_completed + 1
                WHERE id = NEW.profile_id;
            END IF;

        WHEN 'deposit' THEN
            -- Dépôt externe → crédit wallet
            IF NEW.amount > 0 THEN
                UPDATE public.profiles
                SET wallet_balance = wallet_balance + NEW.amount
                WHERE id = NEW.profile_id;
            END IF;

        WHEN 'withdrawal' THEN
            -- Retrait → débit wallet
            IF NEW.amount < 0 THEN
                UPDATE public.profiles
                SET wallet_balance = GREATEST(wallet_balance - v_abs, 0)
                WHERE id = NEW.profile_id;
            END IF;

        WHEN 'contribution' THEN
            -- Cotisation → verrouillage + gain de score
            IF NEW.amount < 0 THEN
                IF NEW.talypay_status = 'wallet_transfer' THEN
                    UPDATE public.profiles
                    SET wallet_balance = GREATEST(wallet_balance - v_abs, 0),
                        total_locked   = total_locked + v_abs,
                        score          = LEAST(score + 5, 1000)
                    WHERE id = NEW.profile_id;
                ELSE
                    UPDATE public.profiles
                    SET total_locked = total_locked + v_abs,
                        score        = LEAST(score + 5, 1000)
                    WHERE id = NEW.profile_id;
                END IF;
            END IF;

        WHEN 'guarantee' THEN
            -- Dépôt de garantie → verrouillage
            IF NEW.amount < 0 THEN
                IF NEW.talypay_status = 'wallet_transfer' THEN
                    UPDATE public.profiles
                    SET wallet_balance = GREATEST(wallet_balance - v_abs, 0),
                        total_locked   = total_locked + v_abs
                    WHERE id = NEW.profile_id;
                ELSE
                    UPDATE public.profiles
                    SET total_locked = total_locked + v_abs
                    WHERE id = NEW.profile_id;
                END IF;
            END IF;

        WHEN 'penalty' THEN
            -- Pénalité → débit wallet + perte de score
            UPDATE public.profiles
            SET wallet_balance = GREATEST(wallet_balance - v_abs, 0),
                score          = GREATEST(score - 20, 0)
            WHERE id = NEW.profile_id;

        WHEN 'refund' THEN
            -- Remboursement → crédit wallet + déblocage
            IF NEW.amount > 0 THEN
                UPDATE public.profiles
                SET wallet_balance = wallet_balance + NEW.amount,
                    total_locked   = GREATEST(total_locked - NEW.amount, 0)
                WHERE id = NEW.profile_id;
            END IF;

        ELSE
            -- Type inconnu : on ne fait rien, on trace
            RAISE WARNING '[fn_update_profile_on_transaction] Type inconnu : %', NEW.type;
    END CASE;

    RETURN NEW;
END;
$$;


-- ============================================================================
-- 13. FONCTION : Effet d'une transaction sur le groupe
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_update_group_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_success BOOLEAN;
BEGIN
    v_success := NEW.talypay_status IN (
        'success', 'simulated_success', 'wallet_transfer'
    );

    IF NOT v_success OR NEW.group_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.type = 'contribution' AND NEW.amount < 0 THEN
        -- Augmenter le pool du groupe
        UPDATE public.groups
        SET total_pool = total_pool + ABS(NEW.amount)
        WHERE id = NEW.group_id;

        -- Marquer le membre comme ayant payé
        UPDATE public.group_members
        SET status    = 'paid',
            paid_date = timezone('utc', now())
        WHERE group_id  = NEW.group_id
          AND profile_id = NEW.profile_id
          AND status    <> 'paid';
    END IF;

    RETURN NEW;
END;
$$;


-- ============================================================================
-- 14. TRIGGERS
-- ============================================================================

-- updated_at automatique sur profiles
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- updated_at automatique sur payment_requests
DROP TRIGGER IF EXISTS trg_payment_requests_updated_at ON public.payment_requests;
CREATE TRIGGER trg_payment_requests_updated_at
    BEFORE UPDATE ON public.payment_requests
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Création du profil après inscription
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Compteur membres du groupe
DROP TRIGGER IF EXISTS trg_group_members_count ON public.group_members;
CREATE TRIGGER trg_group_members_count
    AFTER INSERT OR DELETE ON public.group_members
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_group_members_count();

-- Effets profil sur transaction
DROP TRIGGER IF EXISTS trg_profile_on_transaction ON public.transactions;
CREATE TRIGGER trg_profile_on_transaction
    AFTER INSERT ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_profile_on_transaction();

-- Effets groupe sur transaction
DROP TRIGGER IF EXISTS trg_group_on_transaction ON public.transactions;
CREATE TRIGGER trg_group_on_transaction
    AFTER INSERT ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_group_on_transaction();


-- ============================================================================
-- 15. AUTOMATISATION : prélèvement à l'échéance + versement cagnotte
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_tontine_autodebit_overdue()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_cnt  INTEGER := 0;
    v_due  NUMERIC;
    v_bal  NUMERIC;
    r      RECORD;
BEGIN
    FOR r IN
        SELECT gm.id AS gmid,
               gm.profile_id,
               gm.group_id,
               g.contribution_amount
        FROM public.group_members gm
        INNER JOIN public.groups g ON g.id = gm.group_id
        WHERE g.status = 'active'
          AND g.current_round > 0
          AND g.cotisation_deadline_at IS NOT NULL
          AND g.cotisation_deadline_at <= timezone('utc', now())
          AND gm.status IN ('waiting', 'late')
          AND gm.status IS DISTINCT FROM 'excluded'
    LOOP
        v_due := r.contribution_amount + 20;
        SELECT wallet_balance INTO v_bal FROM public.profiles WHERE id = r.profile_id;
        IF v_bal IS NULL THEN
            v_bal := 0;
        END IF;

        IF v_bal >= v_due THEN
            INSERT INTO public.transactions (
                profile_id, group_id, type, name, amount,
                talypay_reference, talypay_status, customer_phone
            ) VALUES (
                r.profile_id,
                r.group_id,
                'contribution'::public.transaction_type,
                'Cotisation automatique (échéance)',
                -v_due,
                'AUTO-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
                'wallet_transfer',
                NULL
            );
            v_cnt := v_cnt + 1;
        ELSE
            UPDATE public.group_members
            SET status = 'late'
            WHERE id = r.gmid
              AND status = 'waiting';
        END IF;
    END LOOP;

    RETURN v_cnt;
END;
$$;


CREATE OR REPLACE FUNCTION public.fn_tontine_finalize_paid_rounds()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_cnt    INTEGER := 0;
    g        RECORD;
    v_total  INTEGER;
    v_paid   INTEGER;
    v_benef  UUID;
    v_pool   NUMERIC;
    v_next   INTEGER;
BEGIN
    FOR g IN
        SELECT * FROM public.groups
        WHERE status = 'active'
          AND current_round > 0
    LOOP
        SELECT COUNT(*)::INTEGER INTO v_total
        FROM public.group_members
        WHERE group_id = g.id
          AND status IS DISTINCT FROM 'excluded';

        SELECT COUNT(*)::INTEGER INTO v_paid
        FROM public.group_members
        WHERE group_id = g.id
          AND status = 'paid';

        -- Logique Banque Partenaire : Si la date limite est passée, la banque avance les fonds
        IF g.cotisation_deadline_at < timezone('utc', now()) AND v_paid < v_total THEN
            -- Les membres qui n'ont pas payé sont marqués en retard
            UPDATE public.group_members
            SET status = 'late'
            WHERE group_id = g.id
              AND status = 'waiting';
            
            -- La banque complète la cagnotte
            v_pool := v_total * g.contribution_amount;
            v_paid := v_total;
            
            -- Note: On met à jour le pool dans la table aussi pour la cohérence
            UPDATE public.groups SET total_pool = v_pool WHERE id = g.id;
        ELSE
            v_pool := g.total_pool;
        END IF;

        IF v_total = 0 OR v_paid <> v_total THEN
            CONTINUE;
        END IF;

        SELECT profile_id INTO v_benef
        FROM public.group_members
        WHERE group_id = g.id
          AND turn_order = g.current_round
        LIMIT 1;

        IF v_benef IS NULL OR v_pool <= 0 THEN
            CONTINUE;
        END IF;

        INSERT INTO public.transactions (
            profile_id, group_id, type, name, amount, talypay_status
        ) VALUES (
            v_benef,
            g.id,
            'payout'::public.transaction_type,
            'Versement cagnotte · tour ' || g.current_round::text,
            v_pool,
            'simulated_success'
        );

        v_next := g.current_round + 1;

        UPDATE public.groups
        SET
            total_pool = 0,
            current_round = v_next,
            cotisation_deadline_at = CASE
                WHEN v_next > total_rounds THEN NULL
                ELSE timezone('utc', now()) + public.fn_freq_interval(frequency)
            END,
            next_payout_date = CASE
                WHEN v_next > total_rounds THEN NULL
                ELSE timezone('utc', now()) + public.fn_freq_interval(frequency)
            END,
            status = CASE
                WHEN v_next > total_rounds THEN 'completed'::public.group_status
                ELSE status
            END
        WHERE id = g.id;

        UPDATE public.group_members
        SET status = 'waiting', paid_date = NULL
        WHERE group_id = g.id
          AND status IS DISTINCT FROM 'excluded';

        v_cnt := v_cnt + 1;
    END LOOP;

    RETURN v_cnt;
END;
$$;


CREATE OR REPLACE FUNCTION public.rpc_tontine_automation()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_debit INTEGER;
    v_fin   INTEGER;
BEGIN
    v_debit := public.fn_tontine_autodebit_overdue();
    v_fin := public.fn_tontine_finalize_paid_rounds();
    RETURN json_build_object(
        'autodebit_count', v_debit,
        'rounds_finalized', v_fin
    );
END;
$$;

-- Groupes déjà actifs sans tour : démarrer au tour 1 + échéance
UPDATE public.groups g
SET
    current_round = 1,
    cotisation_deadline_at = COALESCE(
        g.cotisation_deadline_at,
        timezone('utc', now()) + public.fn_freq_interval(g.frequency)
    ),
    next_payout_date = COALESCE(
        g.next_payout_date,
        timezone('utc', now()) + public.fn_freq_interval(g.frequency)
    )
WHERE g.status = 'active'
  AND g.current_round = 0;

GRANT EXECUTE ON FUNCTION public.rpc_tontine_automation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_tontine_automation() TO service_role;


-- ============================================================================
-- FIN DU SCHÉMA
-- ============================================================================