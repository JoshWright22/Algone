package io.github.joshwright22.algone.a11y

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONArray
import org.json.JSONObject

/**
 * Goes back (or home) when an app shows a screen the person chose to block, such as
 * YouTube Shorts. Rules come from the Algone app as data (packages/rules/apps). It reads
 * view ids, and the label of a tab only once that tab is selected. It never reads post
 * text and sends nothing anywhere.
 */
class AlgoneAccessibilityService : AccessibilityService() {
  private data class Screen(val action: String, val always: Boolean, val viewIds: List<String>, val descriptions: List<String>)

  private var rulesJson: String? = null
  private var normal: Map<String, List<Screen>> = emptyMap()
  private var onBreak: Map<String, List<Screen>> = emptyMap()
  private var breakUntil = 0L
  private var lastAction = 0L
  private var backs = 0
  private var backsSince = 0L

  override fun onServiceConnected() {
    reloadIfChanged()
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    val pkg = event?.packageName?.toString() ?: return
    reloadIfChanged()
    // The break ends here by the wall clock, even when the Algone app is not running.
    val rules = if (System.currentTimeMillis() < breakUntil) onBreak else normal
    val screens = rules[pkg] ?: return
    val now = SystemClock.uptimeMillis()
    // One action per moment: going back fires more events, which must not cascade.
    if (now - lastAction < ACTION_GAP_MS) return
    val root = rootInActiveWindow ?: return
    if (root.packageName?.toString() != pkg) return
    val stateChange = event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
    for (screen in screens) {
      if (matches(root, pkg, screen, stateChange)) {
        lastAction = now
        performGlobalAction(nextAction(screen.action, now))
        return
      }
    }
  }

  /** If backing out keeps landing on a blocked screen, go home instead of looping. */
  private fun nextAction(action: String, now: Long): Int {
    if (action == "home") return GLOBAL_ACTION_HOME
    if (now - backsSince > LOOP_WINDOW_MS) {
      backsSince = now
      backs = 0
    }
    backs++
    return if (backs > MAX_BACKS) GLOBAL_ACTION_HOME else GLOBAL_ACTION_BACK
  }

  override fun onInterrupt() {}

  private fun matches(root: AccessibilityNodeInfo, pkg: String, screen: Screen, stateChange: Boolean): Boolean {
    if (screen.always) return true
    for (id in screen.viewIds) {
      if (root.findAccessibilityNodeInfosByViewId("$pkg:id/$id").any { it.isVisibleToUser }) return true
    }
    // The tab search walks the tree, so it runs only when the screen changes, not on every scroll.
    if (stateChange && screen.descriptions.isNotEmpty() && selectedTabMatches(root, screen.descriptions)) return true
    return false
  }

  /** A tab label counts only when that tab is selected; labels of other nodes are never read. */
  private fun selectedTabMatches(root: AccessibilityNodeInfo, labels: List<String>): Boolean {
    val queue = ArrayDeque<AccessibilityNodeInfo>()
    queue.add(root)
    var visited = 0
    while (queue.isNotEmpty() && visited < MAX_NODES) {
      val node = queue.removeFirst()
      visited++
      if ((node.isSelected || node.isChecked) && node.isVisibleToUser) {
        val desc = node.contentDescription?.toString()?.trim()
        if (desc != null && labels.any { it.equals(desc, ignoreCase = true) }) return true
      }
      for (i in 0 until node.childCount) node.getChild(i)?.let { queue.add(it) }
    }
    return false
  }

  private fun reloadIfChanged() {
    val json = getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_RULES, "{}") ?: "{}"
    if (json == rulesJson) return
    rulesJson = json
    val o = try { JSONObject(json) } catch (e: Exception) { JSONObject() }
    normal = parse(o.optJSONArray("normal"))
    onBreak = parse(o.optJSONArray("onBreak"))
    breakUntil = o.optLong("breakUntil", 0L)
  }

  companion object {
    const val PREFS = "algone_a11y"
    const val KEY_RULES = "rules"
    private const val ACTION_GAP_MS = 800L
    private const val LOOP_WINDOW_MS = 5000L
    private const val MAX_BACKS = 3
    private const val MAX_NODES = 600

    private fun strings(arr: JSONArray?): List<String> =
      if (arr == null) emptyList() else List(arr.length()) { arr.optString(it) }.filter { it.isNotEmpty() }

    /** A malformed entry is skipped; the rest still apply. */
    private fun parse(list: JSONArray?): Map<String, List<Screen>> {
      val out = HashMap<String, MutableList<Screen>>()
      if (list == null) return out
      for (i in 0 until list.length()) {
        try {
          val app = list.getJSONObject(i)
          val screens = app.optJSONArray("screens") ?: continue
          val parsed = List(screens.length()) { j ->
            val s = screens.getJSONObject(j)
            val m = s.optJSONObject("match")
            Screen(
              action = if (s.optString("action") == "home") "home" else "back",
              always = m?.optBoolean("always", false) ?: false,
              viewIds = strings(m?.optJSONArray("viewIds")),
              descriptions = strings(m?.optJSONArray("descriptions")),
            )
          }
          for (p in strings(app.optJSONArray("packages"))) out.getOrPut(p) { mutableListOf() }.addAll(parsed)
        } catch (e: Exception) {
          continue
        }
      }
      return out
    }
  }
}
