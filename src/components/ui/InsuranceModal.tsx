import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Shield, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InsuranceModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function InsuranceModal({ 
  trigger, 
  open, 
  onOpenChange 
}: InsuranceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-gray-100">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            Assurance Obligatoire
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-600 dark:text-gray-400">
            Informations importantes sur la couverture assurance pour les membres
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Pourquoi l'assurance */}
          <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Pourquoi une assurance ?
                </p>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  L'assurance protège tous les membres du groupe en cas d'imprévu (décès, invalidité, incapacité de payer). Elle garantit que le cycle se poursuit même si un membre ne peut plus cotiser.
                </p>
              </div>
            </div>
          </div>

          {/* Ce qui est couvert */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              Ce qui est couvert
            </p>
            <ul className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400 mt-0.5 font-bold">✓</span>
                <span>Poursuite du cycle en cas de décès d'un membre</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400 mt-0.5 font-bold">✓</span>
                <span>Couverture en cas d'invalidité permanente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400 mt-0.5 font-bold">✓</span>
                <span>Protection contre la perte d'emploi prolongée</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400 mt-0.5 font-bold">✓</span>
                <span>Maladie grave empêchant de cotiser</span>
              </li>
            </ul>
          </div>

          {/* Coût */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Coût de l'assurance
                </p>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  La prime d'assurance est de <strong className="text-gray-900 dark:text-gray-100">2% du montant de la cotisation</strong> par tour. Elle est prélevée automatiquement avec chaque cotisation.
                </p>
              </div>
            </div>
          </div>

          {/* Comment ça marche */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Comment ça marche ?
            </p>
            <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
              <p>1. La prime est déduite automatiquement de chaque cotisation</p>
              <p>2. En cas de sinistre, l'assurance prend en charge les cotisations du membre</p>
              <p>3. Le cycle continue normalement pour tous les autres membres</p>
              <p>4. Les bénéficiaires désignés reçoivent le montant prévu</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button 
            onClick={() => onOpenChange?.(false)}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white text-sm font-medium px-6 py-2.5"
          >
            J'ai compris
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
