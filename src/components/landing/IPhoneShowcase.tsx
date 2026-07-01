import IPhoneFrame from "./IPhoneFrame";
import {
  CryptoScreenPreview,
  HomeScreenPreview,
  WhatsAppScreenPreview,
} from "./LandingScreenPreviews";
import PartnerLogos from "./PartnerLogos";

interface IPhoneShowcaseProps {
  tvlFcfa: number;
  btcReserve: number;
}

/** Scène hero : téléphones natifs (UI réelle), fond fusionné avec la page. */
export default function IPhoneShowcase({ tvlFcfa, btcReserve }: IPhoneShowcaseProps) {
  return (
    <div className="tc-phone-stage w-full">
      <div className="tc-phone-glow tc-phone-glow-violet" aria-hidden />
      <div className="tc-phone-glow tc-phone-glow-amber" aria-hidden />
      <div className="tc-phone-glow tc-phone-glow-emerald" aria-hidden />

      <div className="relative flex items-end justify-center gap-3 sm:gap-5 lg:gap-6 min-h-[380px] sm:min-h-[420px] pt-4 pb-2">
        <div className="tc-phone-float tc-phone-float-left z-10 -mb-2 sm:mb-0">
          <IPhoneFrame size="sm" tilt="left">
            <HomeScreenPreview />
          </IPhoneFrame>
        </div>

        <div className="z-30 -translate-y-2 sm:-translate-y-4 tc-phone-float">
          <div className="scale-[1.03] sm:scale-105 origin-bottom">
            <IPhoneFrame size="md" tilt="none">
              <WhatsAppScreenPreview />
            </IPhoneFrame>
          </div>
        </div>

        <div className="tc-phone-float tc-phone-float-right z-10 hidden sm:block -mb-1">
          <IPhoneFrame size="sm" tilt="right">
            <CryptoScreenPreview tvlFcfa={tvlFcfa} btcReserve={btcReserve} />
          </IPhoneFrame>
        </div>
      </div>

      <div className="tc-phone-stage-fade" aria-hidden />

      <div className="relative pt-6 sm:pt-8 border-t border-violet-100/60">
        <PartnerLogos />
      </div>
    </div>
  );
}
