package com.example.controlplane

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.util.UUID

/**
 * The core service that interacts with the UI using the Accessibility Framework.
 * It implements our controller interface to provide a clean separation of concerns.
 * This version includes a robust caching mechanism for stable node IDs.
 */
class UniversalInteractionService : AccessibilityService(), AccessibilityController {

    companion object {
        // A static instance to allow other parts of the app to easily access this service.
        var instance: UniversalInteractionService? = null
    }

    // A cache to hold nodes from the last UI inspection. This provides stable IDs for a single operation.
    private val nodeCache = mutableMapOf<String, AccessibilityNodeInfo>()

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        println("UniversalInteractionService connected.")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // We could clear the cache here on certain window change events if needed,
        // but for now, we clear it on every new find operation for simplicity.
    }

    override fun onInterrupt() {
        println("UniversalInteractionService interrupted.")
    }

    override fun onUnbind(intent: Intent?): Boolean {
        instance = null
        println("UniversalInteractionService disconnected.")
        return super.onUnbind(intent)
    }

    // --- Implementation of AccessibilityController --- //

    override suspend fun findNodes(selector: Selector): List<NodeInfo> {
        val rootNode = rootInActiveWindow ?: return emptyList()
        
        // Clear the cache at the start of every find operation.
        // This ensures we are always working with the latest UI state.
        nodeCache.clear()

        val foundNodes = mutableListOf<AccessibilityNodeInfo>()

        // A recursive function to search the node tree
        fun search(node: AccessibilityNodeInfo) {
            when (selector.type) {
                "text" -> if (node.text?.toString().equals(selector.value, ignoreCase = true)) foundNodes.add(node)
                "id" -> if (node.viewIdResourceName == selector.value) foundNodes.add(node)
            }
            for (i in 0 until node.childCount) {
                // Important: Recycle the child node after use to avoid memory leaks
                node.getChild(i)?.let { child ->
                    search(child)
                    child.recycle()
                }
            }
        }

        search(rootNode)
        rootNode.recycle()

        // For each found node, generate a stable ID, cache it, and create a NodeInfo object
        return foundNodes.map { node ->
            val stableId = UUID.randomUUID().toString()
            nodeCache[stableId] = node
            node.toNodeInfo(stableId)
        }
    }

    override suspend fun click(nodeId: String): Boolean {
        // Look up the node directly from our cache. This is fast and reliable.
        val targetNode = nodeCache[nodeId]

        if (targetNode == null) {
            println("Error: Node with ID '$nodeId' not found in cache. It might be stale.")
            return false
        }

        if (targetNode.isClickable) {
            return targetNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        }

        // If the node itself is not clickable, traverse up to find a clickable parent
        var parent = targetNode.parent
        while (parent != null) {
            if (parent.isClickable) {
                val result = parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                parent.recycle()
                return result
            }
            val oldParent = parent
            parent = parent.parent
            oldParent.recycle()
        }

        return false
    }

    override suspend fun type(nodeId: String, text: String): Boolean {
        val targetNode = nodeCache[nodeId]
        if (targetNode == null) {
            println("Error: Node with ID '$nodeId' not found in cache for typing.")
            return false
        }

        val arguments = Bundle()
        arguments.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
        val result = targetNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
        targetNode.recycle()
        return result
    }

    override suspend fun scroll(nodeId: String, direction: String): Boolean {
        val targetNode = nodeCache[nodeId]
        if (targetNode == null) {
            println("Error: Node with ID '$nodeId' not found in cache for scrolling.")
            return false
        }

        val scrollAction = when (direction.lowercase()) {
            "forward", "down" -> AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
            "backward", "up" -> AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
            else -> {
                println("Error: Invalid scroll direction '$direction'")
                return false
            }
        }

        // Find a scrollable parent if the target node isn't scrollable itself
        var scrollableNode: AccessibilityNodeInfo? = targetNode
        while (scrollableNode != null && !scrollableNode.isScrollable) {
            val parent = scrollableNode.parent
            if (scrollableNode != targetNode) scrollableNode.recycle() // Recycle intermediate nodes
            scrollableNode = parent
        }

        if (scrollableNode == null) {
            if (targetNode != scrollableNode) targetNode.recycle()
            println("Error: No scrollable container found for node ID '$nodeId'")
            return false
        }

        val result = scrollableNode.performAction(scrollAction)
        scrollableNode.recycle()
        if (targetNode != scrollableNode) targetNode.recycle()
        return result
    }
}

/**
 * Extension function to convert an AccessibilityNodeInfo to our simplified NodeInfo data class.
 * It now requires a stable, generated ID and can include children.
 */
fun AccessibilityNodeInfo.toNodeInfo(stableId: String, children: List<NodeInfo> = emptyList()): NodeInfo {
    return NodeInfo(
        nodeId = stableId,
        text = this.text?.toString(),
        resourceId = this.viewIdResourceName,
        className = this.className?.toString(),
        isClickable = this.isClickable,
        children = children
    )
}
        nodeCache[stableId] = node

        val children = (0 until node.childCount).mapNotNull { i ->
            node.getChild(i)?.let { child ->
                val childNodeInfo = buildNodeTree(child)
                child.recycle()
                childNodeInfo
            }
        }

        return node.toNodeInfo(stableId, children)
    }
}

/**
 * Extension function to convert an AccessibilityNodeInfo to our simplified NodeInfo data class.
 * It now requires a stable, generated ID.
 */
fun AccessibilityNodeInfo.toNodeInfo(stableId: String): NodeInfo {
    return NodeInfo(
        nodeId = stableId,
        text = this.text?.toString(),
        resourceId = this.viewIdResourceName
    )
}
