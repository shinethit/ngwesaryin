import React from 'react';
import { Vehicle, TirePressureLog } from '../../types';
import { Disc, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { formatDurationDays } from '../../utils/vehicleAnalytics';

interface TireVisualizerProps {
  vehicle: Vehicle;
  latestLog?: TirePressureLog | null;
  onOpenAddModal: () => void;
  lang: 'my' | 'en';
}

export const TireVisualizer: React.FC<TireVisualizerProps> = ({
  vehicle,
  latestLog,
  onOpenAddModal,
  lang,
}) => {
  const isTwoWheeler = vehicle.type === 'motorcycle';
  const recFront = vehicle.recommendedTirePressureFront || (isTwoWheeler ? 29 : 32);
  const recRear = vehicle.recommendedTirePressureRear || (isTwoWheeler ? 33 : 34);

  const daysSince = latestLog?.date
    ? Math.max(0, Math.floor((Date.now() - new Date(latestLog.date).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const isDueForCheck = daysSince !== null && daysSince > 21; // Over 3 weeks

  const getPsiStatus = (current?: number, recommended?: number) => {
    if (!current || !recommended) return { color: 'text-slate-600 bg-slate-100 border-slate-200', label: '-' };
    const diff = current - recommended;
    if (Math.abs(diff) <= 2) {
      return {
        color: 'text-emerald-700 bg-emerald-50 border-emerald-300',
        label: lang === 'my' ? 'ပုံမှန်' : 'Normal',
      };
    } else if (diff < -2) {
      return {
        color: 'text-amber-700 bg-amber-50 border-amber-300',
        label: lang === 'my' ? 'လေလျော့' : 'Low',
      };
    } else {
      return {
        color: 'text-blue-700 bg-blue-50 border-blue-300',
        label: lang === 'my' ? 'လေပို' : 'High',
      };
    }
  };

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-800 text-sm">
              {lang === 'my' ? 'တာယာ လေပေါင်ချိန် အခြေအနေ' : 'Tire Pressure & Status'}
            </h4>
            {daysSince !== null && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  isDueForCheck
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                <Clock className="w-3 h-3" />
                {lang === 'my'
                  ? `${daysSince} ရက်အကြာက ချိန်ထားသည်`
                  : `${daysSince} days ago`}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {lang === 'my'
              ? `အကြံပြု လေပေါင် - ရှေ့ (${recFront} PSI) ၊ နောက် (${recRear} PSI)`
              : `Recommended PSI - Front: ${recFront}, Rear: ${recRear}`}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddModal}
          className="px-3.5 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-all cursor-pointer self-start sm:self-auto"
        >
          {lang === 'my' ? '+ လေထိုး/လေချိန် မှတ်မည်' : '+ Log Tire Check'}
        </button>
      </div>

      {/* Visualizer Frame */}
      {isTwoWheeler ? (
        /* Motorcycle View */
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-100">
          <div className="w-48 space-y-6">
            {/* Front Wheel */}
            {(() => {
              const status = getPsiStatus(latestLog?.frontPsi, recFront);
              return (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white border shadow-xs">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">
                      {lang === 'my' ? 'ရှေ့ဘီး (Front)' : 'Front Wheel'}
                    </span>
                    <span className="text-[10px] text-slate-400">Rec: {recFront} PSI</span>
                  </div>
                  <div className={`px-3 py-1 rounded-xl font-mono font-bold text-sm border ${status.color}`}>
                    {latestLog?.frontPsi ?? '--'} <span className="text-[10px]">PSI</span>
                  </div>
                </div>
              );
            })()}

            {/* Bike Chassis Connector Graphic */}
            <div className="h-10 w-2 bg-slate-300 rounded-full mx-auto relative flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-xs">
                <Disc className="w-4 h-4 animate-spin-slow" />
              </div>
            </div>

            {/* Rear Wheel */}
            {(() => {
              const status = getPsiStatus(latestLog?.rearPsi, recRear);
              return (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white border shadow-xs">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">
                      {lang === 'my' ? 'နောက်ဘီး (Rear)' : 'Rear Wheel'}
                    </span>
                    <span className="text-[10px] text-slate-400">Rec: {recRear} PSI</span>
                  </div>
                  <div className={`px-3 py-1 rounded-xl font-mono font-bold text-sm border ${status.color}`}>
                    {latestLog?.rearPsi ?? '--'} <span className="text-[10px]">PSI</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        /* Car 4-Wheels View */
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex flex-col items-center">
          <div className="w-full max-w-sm grid grid-cols-2 gap-3 relative py-2">
            {/* Front Left */}
            {(() => {
              const status = getPsiStatus(latestLog?.frontLeftPsi, recFront);
              return (
                <div className="p-3 bg-white rounded-2xl border shadow-xs flex flex-col items-center text-center">
                  <span className="text-[11px] font-bold text-slate-700">
                    {lang === 'my' ? 'ရှေ့ ဘယ် (FL)' : 'Front Left'}
                  </span>
                  <span className="text-[9px] text-slate-400 mb-1.5">Rec: {recFront} PSI</span>
                  <div className={`w-full py-1 rounded-xl font-mono font-bold text-sm border ${status.color}`}>
                    {latestLog?.frontLeftPsi ?? '--'} <span className="text-[10px]">PSI</span>
                  </div>
                </div>
              );
            })()}

            {/* Front Right */}
            {(() => {
              const status = getPsiStatus(latestLog?.frontRightPsi, recFront);
              return (
                <div className="p-3 bg-white rounded-2xl border shadow-xs flex flex-col items-center text-center">
                  <span className="text-[11px] font-bold text-slate-700">
                    {lang === 'my' ? 'ရှေ့ ညာ (FR)' : 'Front Right'}
                  </span>
                  <span className="text-[9px] text-slate-400 mb-1.5">Rec: {recFront} PSI</span>
                  <div className={`w-full py-1 rounded-xl font-mono font-bold text-sm border ${status.color}`}>
                    {latestLog?.frontRightPsi ?? '--'} <span className="text-[10px]">PSI</span>
                  </div>
                </div>
              );
            })()}

            {/* Middle Car Silhouette */}
            <div className="col-span-2 flex items-center justify-center my-0.5">
              <div className="px-4 py-1 bg-slate-200/80 rounded-full text-[10px] font-semibold text-slate-600 flex items-center gap-1.5">
                <Disc className="w-3 h-3 text-teal-600" />
                <span>{vehicle.name} ({vehicle.plateNumber || 'Vehicle'})</span>
              </div>
            </div>

            {/* Rear Left */}
            {(() => {
              const status = getPsiStatus(latestLog?.rearLeftPsi, recRear);
              return (
                <div className="p-3 bg-white rounded-2xl border shadow-xs flex flex-col items-center text-center">
                  <span className="text-[11px] font-bold text-slate-700">
                    {lang === 'my' ? 'နောက် ဘယ် (RL)' : 'Rear Left'}
                  </span>
                  <span className="text-[9px] text-slate-400 mb-1.5">Rec: {recRear} PSI</span>
                  <div className={`w-full py-1 rounded-xl font-mono font-bold text-sm border ${status.color}`}>
                    {latestLog?.rearLeftPsi ?? '--'} <span className="text-[10px]">PSI</span>
                  </div>
                </div>
              );
            })()}

            {/* Rear Right */}
            {(() => {
              const status = getPsiStatus(latestLog?.rearRightPsi, recRear);
              return (
                <div className="p-3 bg-white rounded-2xl border shadow-xs flex flex-col items-center text-center">
                  <span className="text-[11px] font-bold text-slate-700">
                    {lang === 'my' ? 'နောက် ညာ (RR)' : 'Rear Right'}
                  </span>
                  <span className="text-[9px] text-slate-400 mb-1.5">Rec: {recRear} PSI</span>
                  <div className={`w-full py-1 rounded-xl font-mono font-bold text-sm border ${status.color}`}>
                    {latestLog?.rearRightPsi ?? '--'} <span className="text-[10px]">PSI</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Footer Info / Warning */}
      {isDueForCheck && (
        <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {lang === 'my'
              ? 'တာယာ လေပေါင်ချိန် မစစ်ဆေးရသေးသည်မှာ ၃ ပတ်ကျော်လွန်နေပါပြီ။ လေပေါင်ချိန် စစ်ဆေးရန် အကြံပြုအပ်ပါသည်။'
              : 'Over 3 weeks since last tire check. Please check tire pressure soon.'}
          </span>
        </div>
      )}
    </div>
  );
};
