import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNav } from "./nav";
import { RADIUS, useColors } from "./theme";

export function Screen({ title, children }: { title?: string; children: ReactNode }) {
  const c = useColors();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      {title ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12 }}>
          <Button kind="ghost" label="Back" onPress={nav.pop} />
          <Body strong size={18}>{title}</Body>
        </View>
      ) : null}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function Body(props: { children: ReactNode; muted?: boolean; strong?: boolean; size?: number; mono?: boolean }) {
  const c = useColors();
  return (
    <Text
      style={{
        color: props.muted ? c.muted : c.text,
        fontSize: props.size ?? 15,
        lineHeight: (props.size ?? 15) * 1.4,
        fontWeight: props.strong ? "600" : "400",
        ...(props.mono ? { fontFamily: "monospace" } : {}),
      }}
    >
      {props.children}
    </Text>
  );
}

export function Button(props: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "ghost";
  disabled?: boolean;
}) {
  const c = useColors();
  const primary = props.kind === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!props.disabled }}
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => ({
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: RADIUS,
        borderWidth: 1,
        borderColor: primary ? c.accent : c.border,
        backgroundColor: primary ? c.accent : pressed ? c.surfaceStrong : c.surface,
        opacity: props.disabled ? 0.5 : 1,
        alignItems: "center",
      })}
    >
      <Text style={{ color: primary ? c.accentInk : c.text, fontWeight: "600", fontSize: 14 }}>{props.label}</Text>
    </Pressable>
  );
}

export function Card({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <View
      style={{
        padding: 14,
        gap: 10,
        borderRadius: RADIUS,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
      }}
    >
      {children}
    </View>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>{children}</View>;
}

export function Field(props: TextInputProps) {
  const c = useColors();
  return (
    <TextInput
      placeholderTextColor={c.muted}
      {...props}
      style={{
        color: c.text,
        fontSize: 15,
        padding: 12,
        borderRadius: RADIUS,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
      }}
    />
  );
}

/** A one-of-many picker, using text only. */
export function Choice<T extends string>(props: {
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
}) {
  const c = useColors();
  return (
    <Row>
      {props.options.map(([value, label]) => {
        const on = value === props.value;
        return (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => props.onChange(value)}
            style={{
              paddingVertical: 7,
              paddingHorizontal: 11,
              borderRadius: RADIUS,
              borderWidth: 1,
              borderColor: on ? c.accent : c.border,
              backgroundColor: on ? c.surfaceStrong : "transparent",
            }}
          >
            <Text style={{ color: on ? c.text : c.muted, fontSize: 13, fontWeight: on ? "600" : "400" }}>{label}</Text>
          </Pressable>
        );
      })}
    </Row>
  );
}
