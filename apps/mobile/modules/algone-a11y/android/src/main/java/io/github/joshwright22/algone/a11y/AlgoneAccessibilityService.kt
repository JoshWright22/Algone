package io.github.joshwright22.algone.a11y

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONArray

/**
 * Goes back (or home) when an app shows a screen the person chose to block, such as
 * YouTube Shorts. Rules come from the Algone app as data (packages/rules/apps). It reads
 * view ids and the labels of selected tabs only, never post text, and sends nothing anywhere.
 */
class AlgoneAccessibilityService : AccessibilityService() {
  private data class Screen(val action: String, val always: Boolean, val viewIds: List<String>, val descriptions: List<String>)

  private var rulesJson: String? = null
  private var rules: Map<String, List<Screen>> = emptyMap()
  private var lastAction = 0L

  override fun onServiceConnected() {
    reloadIfChanged()
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    val pkg = event?.packageName?.toString() ?: return
    reloadIfChanged()
    val screens = rules[pkg] ?: return
    val now = SystemClock.uptimeMillis()
    // One action per moment: going back fires more events, which must not cascade.
    if (now - lastAction < ACTION_GAP_MS) return
    val root = rootInActiveWindow ?: return
    if (root.packageName?.toString() != pkg) return
    for (screen in screens) {
      if (matches(root, pkg, screen)) {
        lastAction = now
        performGlobalAction(if (screen.action == "home") GLOBAL_ACTION_HOME else GLOBAL_ACTION_BACK)
        return
      }
    }
  }

  override fun onInterrupt() {}

  private fun matches(root: AccessibilityNodeInfo, pkg: String, screen: Screen): Boolean {
    if (screen.always) return true
    for (id in screen.viewIds) {
      if (root.findAccessibilityNodeInfosByViewId("$pkg:id/$id").isNotEmpty()) return true
    }
    if (screen.descriptions.isNotEmpty() && selectedTabMatches(root, screen.descriptions)) return true
    return false
  }

  /** A tab label counts only when that tab is selected, so the tab bar alone never triggers. */
  private fun selectedTabMatches(root: AccessibilityNodeInfo, labels: List<String>): Boolean {
    val queue = ArrayDeque<AccessibilityNodeInfo>()
    queue.add(root)
    var visited = 0
    while (queue.isNotEmpty() && visited < MAX_NODES) {
      val node = queue.removeFirst()
      visited++
      val desc = node.contentDescription?.toString()?.trim()
      if (desc != null && (node.isSelected || node.isChecked) && labels.any { it.equals(desc, ignoreCase = true) }) return true
      for (i in 0 until node.childCount) node.getChild(i)?.let { queue.add(it) }
    }
    return false
  }

  private fun reloadIfChanged() {
    val json = getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_RULES, "[]") ?: "[]"
    if (json == rulesJson) return
    rulesJson = json
    rules = parse(json)
  }

  companion object {
    const val PREFS = "algone_a11y"
    const val KEY_RULES = "rules"
    private const val ACTION_GAP_MS = 800L
    private const val MAX_NODES = 600

    private fun strings(arr: JSONArray?): List<String> =
      if (arr == null) emptyList() else List(arr.length()) { arr.optString(it) }.filter { it.isNotEmpty() }

    /** Bad input means no rules, never a crash: the service then does nothing. */
    private fun parse(json: String): Map<String, List<Screen>> = try {
      val out = HashMap<String, MutableList<Screen>>()
      val list = JSONArray(json)
      for (i in 0 until list.length()) {
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
      }
      out
    } catch (e: Exception) {
      emptyMap()
    }
  }
}
