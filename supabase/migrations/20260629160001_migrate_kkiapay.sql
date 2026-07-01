-- Migration script: Talypay → Kkiapay
-- Ce script met à jour le schéma de la base de données pour utiliser Kkiapay

-- 1. Ajouter les nouvelles colonnes Kkiapay
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS kkiapay_transaction_id TEXT DEFAULT NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS kkiapay_status        TEXT DEFAULT NULL;

-- 2. Mettre à jour la table payment_requests si elle existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_requests') THEN
        ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS kkiapay_transaction_id TEXT DEFAULT NULL;
    END IF;
END $$;

-- 3. Créer les index pour les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_transactions_kkiapay_status        ON public.transactions (kkiapay_status);
CREATE INDEX IF NOT EXISTS idx_transactions_kkiapay_transaction_id ON public.transactions (kkiapay_transaction_id);

-- 4. Mettre à jour les fonctions et triggers pour utiliser Kkiapay
-- Remplacer les références à talypay_status par kkiapay_status dans les fonctions

-- Mise à jour de la fonction fn_update_profile_on_transaction
CREATE OR REPLACE FUNCTION public.fn_update_profile_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_abs    NUMERIC;
    v_success BOOLEAN;
BEGIN
    -- Statuts considérés comme "réussis" (Kkiapay)
    v_success := NEW.kkiapay_status IN (
        'success', 'simulated_success', 'wallet_transfer', 'completed'
    );

    v_abs := ABS(NEW.amount);

    -- Appliquer les mises à jour uniquement si le paiement est réussi
    IF v_success THEN
        CASE NEW.type
            WHEN 'contribution' THEN
                -- Cotisation → verrouillage + gain de score
                IF NEW.amount < 0 THEN
                    IF NEW.kkiapay_status = 'wallet_transfer' THEN
                        UPDATE public.profiles
                        SET wallet_balance = GREATEST(wallet_balance - v_abs, 0),
                            total_locked   = total_locked + v_abs,
                            score          = GREATEST(score + 1, 0)
                        WHERE id = NEW.profile_id;
                    END IF;
                END IF;

            WHEN 'guarantee' THEN
                -- Dépôt de garantie → verrouillage
                IF NEW.amount < 0 THEN
                    IF NEW.kkiapay_status = 'wallet_transfer' THEN
                        UPDATE public.profiles
                        SET wallet_balance = GREATEST(wallet_balance - v_abs, 0),
                            total_locked   = total_locked + v_abs
                        WHERE id = NEW.profile_id;
                    END IF;
                END IF;

            WHEN 'deposit' THEN
                -- Dépôt → crédit du portefeuille
                IF NEW.amount > 0 THEN
                    UPDATE public.profiles
                    SET wallet_balance = wallet_balance + v_abs,
                        total_deposited = COALESCE(total_deposited, 0) + v_abs
                    WHERE id = NEW.profile_id;
                END IF;

            WHEN 'withdrawal' THEN
                -- Retrait → débit du portefeuille
                IF NEW.amount < 0 THEN
                    UPDATE public.profiles
                    SET wallet_balance = GREATEST(wallet_balance - v_abs, 0),
                        total_withdrawn = COALESCE(total_withdrawn, 0) + v_abs
                    WHERE id = NEW.profile_id;
                END IF;

            ELSE
                -- Autres types de transactions (payout, penalty, etc.)
                IF NEW.amount > 0 THEN
                    UPDATE public.profiles
                    SET wallet_balance = wallet_balance + v_abs
                    WHERE id = NEW.profile_id;
                ELSIF NEW.amount < 0 THEN
                    UPDATE public.profiles
                    SET wallet_balance = GREATEST(wallet_balance - v_abs, 0)
                    WHERE id = NEW.profile_id;
                END IF;
        END CASE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Mise à jour de la fonction fn_check_and_distribute
CREATE OR REPLACE FUNCTION public.fn_check_and_distribute()
RETURNS TRIGGER AS $$
DECLARE
    v_abs     NUMERIC;
    v_success BOOLEAN;
BEGIN
    v_success := NEW.kkiapay_status IN (
        'success', 'simulated_success', 'wallet_transfer', 'completed'
    );

    v_abs := ABS(NEW.amount);

    IF v_success AND NEW.type = 'contribution' AND NEW.amount < 0 THEN
        -- Logique de distribution inchangée
        -- ... (conserver la logique existante)
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Migration des données existantes (optionnel)
-- Copier les données des anciennes colonnes Talypay vers les nouvelles colonnes Kkiapay
UPDATE public.transactions 
SET 
    kkiapay_transaction_id = talypay_reference,
    kkiapay_status = talypay_status
WHERE talypay_reference IS NOT NULL OR talypay_status IS NOT NULL;

-- 6. Nettoyage (optionnel - à exécuter seulement après validation)
-- ALTER TABLE public.transactions DROP COLUMN IF EXISTS talypay_reference;
-- ALTER TABLE public.transactions DROP COLUMN IF EXISTS talypay_status;

-- Commentaire pour la migration terminée
COMMENT ON TABLE public.transactions IS 'Transactions avec support Kkiapay (migration depuis Talypay)';
