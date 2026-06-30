-- Corrige kkiapay_status vs talypay_status + restaure la logique ROSCA complète

CREATE OR REPLACE FUNCTION public.fn_payment_success(p_status TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE AS $$
  SELECT p_status IN (
    'success', 'simulated_success', 'wallet_transfer', 'completed',
    'SUCCESS', 'SUCCESSFUL'
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_tx_payment_status(t public.transactions)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE AS $$
  SELECT COALESCE(t.kkiapay_status, t.talypay_status::text);
$$;

CREATE OR REPLACE FUNCTION public.fn_update_profile_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_success BOOLEAN;
    v_abs     NUMERIC;
    v_status  TEXT;
BEGIN
    v_status := public.fn_tx_payment_status(NEW);
    v_success := public.fn_payment_success(v_status);

    IF NOT v_success THEN
        RETURN NEW;
    END IF;

    v_abs := ABS(NEW.amount);

    CASE NEW.type::TEXT
        WHEN 'payout' THEN
            IF NEW.amount > 0 THEN
                UPDATE public.profiles
                SET wallet_balance   = wallet_balance + NEW.amount,
                    total_locked     = GREATEST(total_locked - NEW.amount, 0),
                    cycles_completed = cycles_completed + 1,
                    score            = LEAST(score + 10, 1000)
                WHERE id = NEW.profile_id;
            END IF;

        WHEN 'deposit' THEN
            IF NEW.amount > 0 THEN
                UPDATE public.profiles
                SET wallet_balance = wallet_balance + NEW.amount
                WHERE id = NEW.profile_id;
            END IF;

        WHEN 'withdrawal' THEN
            IF NEW.amount < 0 THEN
                UPDATE public.profiles
                SET wallet_balance = GREATEST(wallet_balance - v_abs, 0)
                WHERE id = NEW.profile_id;
            END IF;

        WHEN 'contribution' THEN
            IF NEW.amount < 0 THEN
                IF v_status = 'wallet_transfer' THEN
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
            IF NEW.amount < 0 THEN
                IF v_status = 'wallet_transfer' THEN
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
            UPDATE public.profiles
            SET wallet_balance = GREATEST(wallet_balance - v_abs, 0),
                score          = GREATEST(score - 20, 0)
            WHERE id = NEW.profile_id;

        WHEN 'refund' THEN
            IF NEW.amount > 0 THEN
                UPDATE public.profiles
                SET wallet_balance = wallet_balance + NEW.amount,
                    total_locked   = GREATEST(total_locked - NEW.amount, 0)
                WHERE id = NEW.profile_id;
            END IF;

        ELSE
            RAISE WARNING '[fn_update_profile_on_transaction] Type inconnu : %', NEW.type;
    END CASE;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_group_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_status TEXT;
BEGIN
    v_status := public.fn_tx_payment_status(NEW);

    IF NOT public.fn_payment_success(v_status) OR NEW.group_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.type = 'contribution' AND NEW.amount < 0 THEN
        UPDATE public.groups
        SET total_pool = total_pool + ABS(NEW.amount)
        WHERE id = NEW.group_id;

        UPDATE public.group_members
        SET status    = 'paid',
            paid_date = timezone('utc', now())
        WHERE group_id   = NEW.group_id
          AND profile_id = NEW.profile_id
          AND status    <> 'paid';
    END IF;

    RETURN NEW;
END;
$$;

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
        IF v_bal IS NULL THEN v_bal := 0; END IF;

        IF v_bal >= v_due THEN
            INSERT INTO public.transactions (
                profile_id, group_id, type, name, amount,
                kkiapay_transaction_id, kkiapay_status,
                talypay_reference, talypay_status, customer_phone
            ) VALUES (
                r.profile_id,
                r.group_id,
                'contribution'::public.transaction_type,
                'Cotisation automatique (échéance)',
                -v_due,
                'AUTO-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
                'wallet_transfer',
                'AUTO-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
                'wallet_transfer',
                NULL
            );
            v_cnt := v_cnt + 1;
        ELSE
            UPDATE public.group_members
            SET status = 'late'
            WHERE id = r.gmid AND status = 'waiting';
        END IF;
    END LOOP;

    RETURN v_cnt;
END;
$$;

-- Backfill kkiapay depuis talypay
UPDATE public.transactions
SET
    kkiapay_status = COALESCE(kkiapay_status, talypay_status::text),
    kkiapay_transaction_id = COALESCE(kkiapay_transaction_id, talypay_reference)
WHERE kkiapay_status IS NULL AND talypay_status IS NOT NULL;
