package com.example.controlplane

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * The main background service for the Android Agent.
 * Its primary responsibility is to start and stop the ApiServer.
 * It runs as a foreground service to prevent the OS from killing it.
 */
class AgentService : Service() {

    private val job = SupervisorJob()
    private val scope = CoroutineScope(Dispatchers.IO + job)

    private lateinit var apiServer: ApiServer

    override fun onCreate() {
        super.onCreate()
        // The ApiServer now gets a direct reference to the running AccessibilityService.
        // This is a simple approach. A more robust solution might use a dependency
        // injection framework or a singleton manager to handle the service lifecycle.
        val controller = UniversalInteractionService.instance
            ?: throw IllegalStateException("AccessibilityService is not connected. Please enable it in Settings.")

        apiServer = ApiServer(controller)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(1, createNotification())

        scope.launch {
            apiServer.start()
        }

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        apiServer.stop()
        job.cancel() // Cancel all coroutines started by this service
    }

    private fun createNotification(): Notification {
        val channelId = "AgentServiceChannel"
        val channel = NotificationChannel(channelId, "Control Plane Agent", NotificationManager.IMPORTANCE_DEFAULT)
        val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(channel)

        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("Android Control Plane Agent")
            .setContentText("API server is running.")
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
