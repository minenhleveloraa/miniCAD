import { useLocalSearchParams } from "expo-router";

import { IncidentResponseScreen } from "@/screens/incident-response";

export default function IncidentResponseRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <IncidentResponseScreen incidentId={id} />;
}
