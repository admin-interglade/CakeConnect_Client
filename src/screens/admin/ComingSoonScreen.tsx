import React from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';

import { EmptyState, Screen, ScreenHeader } from '../../components';
import { strings } from '../../constants';

/**
 * Stands in for the Batch B admin screens still to be built: offers
 * (FR-32-FR-35), the offline-payment confirmation queue (FR-41) and reports
 * (FR-42).
 *
 * They are routed now so the dashboard's quick actions and any deep link
 * resolve instead of throwing; each is replaced by its real screen in turn.
 */

const titles: Record<string, string> = {
  Offers: 'Offers & announcements',
  PaymentsQueue: 'Payment confirmations',
  Reports: 'Reports',
};

export default function ComingSoonScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const title = titles[route.name] ?? strings.placeholder.comingSoon;

  return (
    <Screen>
      <ScreenHeader
        title={title}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      <EmptyState
        icon="progress-wrench"
        title={strings.placeholder.comingSoon}
        message={strings.placeholder.body}
      />
    </Screen>
  );
}
