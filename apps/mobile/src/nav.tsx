import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BackHandler, View } from "react-native";

export type Route =
  | { name: "home" }
  | { name: "site"; site: string; url: string }
  | { name: "queue" }
  | { name: "custom" }
  | { name: "random" }
  | { name: "settings" }
  | { name: "barrier" }
  | { name: "sync" };

interface Nav {
  push(route: Route): void;
  pop(): void;
  replace(route: Route): void;
  /** Back to Home, which stays at the bottom of the stack. */
  home(): void;
}

const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error("useNav outside Navigator");
  return nav;
}

/**
 * A small stack. Lower screens stay mounted but hidden, so a site keeps its page while
 * the Barrier or Queue is on top.
 */
export function Navigator({ render }: { render: (route: Route, active: boolean) => ReactNode }) {
  const nextKey = useRef(1);
  const [stack, setStack] = useState<Array<{ key: number; route: Route }>>([{ key: 0, route: { name: "home" } }]);

  const nav = useMemo<Nav>(() => {
    const entry = (route: Route) => ({ key: nextKey.current++, route });
    return {
      push: (route) => setStack((s) => [...s, entry(route)]),
      pop: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      replace: (route) => setStack((s) => [...s.slice(0, -1), entry(route)]),
      home: () => setStack((s) => s.slice(0, 1)),
    };
  }, []);

  const depth = stack.length;
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (depth <= 1) return false;
      nav.pop();
      return true;
    });
    return () => sub.remove();
  }, [depth, nav]);

  return (
    <NavContext.Provider value={nav}>
      {stack.map(({ key, route }, i) => {
        const active = i === stack.length - 1;
        return (
          <View key={key} style={{ flex: 1, display: active ? "flex" : "none" }}>
            {render(route, active)}
          </View>
        );
      })}
    </NavContext.Provider>
  );
}
