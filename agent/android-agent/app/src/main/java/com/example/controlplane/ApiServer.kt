package com.example.controlplane

import io.ktor.serialization.gson.gson
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.*
import java.util.UUID

/**
 * The core API server that listens for commands from the control plane.
 * It uses Ktor as its underlying web server framework.
 */
class ApiServer(private val controller: AccessibilityController) {

    private val server = embeddedServer(Netty, port = 8080, module = { apiModule() })

    fun start() {
        server.start(wait = false)
    }

    fun stop() {
        server.stop(1_000, 2_000)
    }

    private fun Application.apiModule() {
        install(ContentNegotiation) {
            gson()
        }

        routing {
            get("/health") {
                call.respond(mapOf("status" to "ok"))
            }

            post("/ui/find") {
                val selector = call.receive<Selector>()
                val nodes = controller.findNodes(selector)
                call.respond(createSuccessResponse(nodes))
            }

            post("/ui/click") {
                val body = call.receive<Map<String, String>>()
                val nodeId = body["node_id"] ?: throw IllegalArgumentException("Missing node_id")
                val result = controller.click(nodeId)
                call.respond(createSuccessResponse(mapOf("clicked" to result)))
            }

            post("/ui/type") {
                val body = call.receive<Map<String, String>>()
                val nodeId = body["nodeId"] ?: throw IllegalArgumentException("Missing nodeId")
                val text = body["text"] ?: throw IllegalArgumentException("Missing text")
                val result = controller.type(nodeId, text)
                call.respond(createSuccessResponse(mapOf("typed" to result)))
            }

            post("/ui/scroll") {
                val body = call.receive<Map<String, String>>()
                val nodeId = body["nodeId"] ?: throw IllegalArgumentException("Missing nodeId")
                val direction = body["direction"] ?: throw IllegalArgumentException("Missing direction")
                val result = controller.scroll(nodeId, direction)
                call.respond(createSuccessResponse(mapOf("scrolled" to result)))
            }
        }
    }

    private fun createErrorResponse(message: String): Map<String, Any> {
        return mapOf(
            "requestId" to UUID.randomUUID().toString(),
            "status" to "error",
            "error" to message
        )
    }
}
sponse("Failed to inspect UI tree"))
                }
            }
        }
    }

    private fun createSuccessResponse(result: Any): Map<String, Any> {
        return mapOf(
            "requestId" to UUID.randomUUID().toString(),
            "status" to "success",
            "result" to result
        )
    }
}
