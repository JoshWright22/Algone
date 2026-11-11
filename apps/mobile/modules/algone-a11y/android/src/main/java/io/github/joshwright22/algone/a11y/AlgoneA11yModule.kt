package io.github.joshwright22.algone.a11y

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AlgoneA11yModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "No Android context" }

  override fun definition() = ModuleDefinition {
    Name("AlgoneA11y")

    /** Rules as JSON, from activeAndroidRules in @algone/core. The service rereads them on its next event. */
    Function("setRules") { json: String ->
      context.getSharedPreferences(AlgoneAccessibilityService.PREFS, Context.MODE_PRIVATE)
        .edit().putString(AlgoneAccessibilityService.KEY_RULES, json).apply()
    }

    Function("isEnabled") {
      val me = ComponentName(context, AlgoneAccessibilityService::class.java).flattenToString()
      val enabled = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
      enabled.split(':').any { it.equals(me, ignoreCase = true) }
    }

    Function("openSettings") {
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }
  }
}
