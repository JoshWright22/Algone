import { View } from "react-native";
import { currentBatch, ratingOf, type HealthyItem, type Rating } from "@algone/core";
import { MOBILE_COPY } from "../copy";
import { store } from "../store";
import { useStored } from "../theme";
import { Body, Button, Card, Row } from "../ui";

const RATINGS: Array<[Rating, string]> = [["worth", "Worth it"], ["notWorth", "Not worth it"], ["worse", "Made me feel worse"]];

/** Today's batch for a site in Healthy mode, in place of its feed. Like the extension's panel. */
export function HealthyBatch(props: { site: string; name: string; onOpen: (item: HealthyItem) => void; onLeave: () => void }) {
  const { settings, healthy } = useStored();
  const batch = currentBatch(settings, props.site, healthy, Date.now());
  const seen = new Set(healthy.seen);
  const left = batch.items.filter((i) => !seen.has(i.id));
  const ended = batch.end === "budget" || (batch.items.length > 0 && left.length === 0);
  const honest = <Body muted size={13}>{MOBILE_COPY.healthyNote(props.name)}</Body>;

  if (ended) {
    return (
      <Card>
        <Body strong size={18}>{batch.end === "budget" ? "That's your time for today" : "That's today's batch"}</Body>
        {settings.activities.length ? (
          <>
            <Body>Something else to do:</Body>
            {settings.activities.map((a, i) => <Body key={i}>{`• ${a}`}</Body>)}
          </>
        ) : (
          <Body muted>Add a few things you'd rather do in Settings, and they'll show here.</Body>
        )}
        <Button kind="primary" label={`Leave ${props.name}`} onPress={props.onLeave} />
        {honest}
      </Card>
    );
  }

  if (!batch.items.length) {
    return (
      <Card>
        <Body strong>Today's batch</Body>
        <Body muted>{`Picking from what ${props.name} loaded. If nothing shows, search instead.`}</Body>
        {honest}
      </Card>
    );
  }

  return (
    <Card>
      <Body strong>Today's batch</Body>
      <Body muted size={13}>{`${left.length} of ${batch.items.length} left`}</Body>
      {batch.items.map((i) => {
        const opened = seen.has(i.id);
        return (
          <View key={i.id} style={{ gap: 6 }}>
            <Button kind="ghost" label={opened ? `Seen: ${i.title}` : i.title} onPress={() => props.onOpen(i)} />
            {i.channel ? <Body muted size={13}>{i.channel}</Body> : null}
            {opened && i.channel && !ratingOf(healthy.ratings, i.channel) ? (
              <Row>
                {RATINGS.map(([r, label]) => (
                  <Button key={r} label={label} onPress={() => void store.rate(i.channel, r)} />
                ))}
              </Row>
            ) : null}
          </View>
        );
      })}
      {honest}
    </Card>
  );
}
