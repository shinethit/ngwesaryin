import { useState } from 'react';

/**
 * Custom hook to orchestrate all application modal and drawer states.
 */
export function useAppModals() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isSyncStatusDrawerOpen, setIsSyncStatusDrawerOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isUserGuideModalOpen, setIsUserGuideModalOpen] = useState(false);
  const [isShareAppModalOpen, setIsShareAppModalOpen] = useState(false);
  const [isVersionHistoryModalOpen, setIsVersionHistoryModalOpen] = useState(false);
  const [isDatabaseTrackerOpen, setIsDatabaseTrackerOpen] = useState(false);
  const [isSyncHealthModalOpen, setIsSyncHealthModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isReconcileBalanceModalOpen, setIsReconcileBalanceModalOpen] = useState(false);
  const [isPinSetupModalOpen, setIsPinSetupModalOpen] = useState(false);
  const [isPinLockScreenOpen, setIsPinLockScreenOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  return {
    isAuthModalOpen, setIsAuthModalOpen,
    isAdminPanelOpen, setIsAdminPanelOpen,
    isSyncStatusDrawerOpen, setIsSyncStatusDrawerOpen,
    isAccountModalOpen, setIsAccountModalOpen,
    isPremiumModalOpen, setIsPremiumModalOpen,
    isSearchModalOpen, setIsSearchModalOpen,
    isPrivacyModalOpen, setIsPrivacyModalOpen,
    isUserGuideModalOpen, setIsUserGuideModalOpen,
    isShareAppModalOpen, setIsShareAppModalOpen,
    isVersionHistoryModalOpen, setIsVersionHistoryModalOpen,
    isDatabaseTrackerOpen, setIsDatabaseTrackerOpen,
    isSyncHealthModalOpen, setIsSyncHealthModalOpen,
    isTransactionModalOpen, setIsTransactionModalOpen,
    isDebtModalOpen, setIsDebtModalOpen,
    isRepaymentModalOpen, setIsRepaymentModalOpen,
    isNotificationModalOpen, setIsNotificationModalOpen,
    isReconcileBalanceModalOpen, setIsReconcileBalanceModalOpen,
    isPinSetupModalOpen, setIsPinSetupModalOpen,
    isPinLockScreenOpen, setIsPinLockScreenOpen,
    isWalletModalOpen, setIsWalletModalOpen,
    isCategoryModalOpen, setIsCategoryModalOpen,
  };
}
