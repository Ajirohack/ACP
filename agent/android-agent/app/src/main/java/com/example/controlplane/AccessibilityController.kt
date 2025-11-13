package com.example.controlplane

/**
 * Defines the contract for a controller that can interact with the device's UI.
 * This interface is used by the ApiServer to decouple it from the implementation
 * details of the UI interaction mechanism (e.g., Accessibility Service).
 */
interface AccessibilityController {
    /**
     * Finds UI nodes on the screen matching a given selector.
     * @param selector The query to find the nodes.
     * @return A list of simplified node representations.
     */
    suspend fun findNodes(selector: Selector): List<NodeInfo>

    /**
     * Performs a click action on a specific node.
     * @param nodeId The unique identifier of the node to click.
     * @return True if the action was successful, false otherwise.
     */
    suspend fun click(nodeId: String): Boolean

    /**
     * Types text into a specific node.
     * @param nodeId The unique identifier of the node.
     * @param text The text to type.
     * @return True if the action was successful, false otherwise.
     */
    suspend fun type(nodeId: String, text: String): Boolean

    /**
     * Performs a scroll action on a node or its scrollable parent.
     * @param nodeId The unique identifier of the node.
     * @param direction The direction to scroll ("forward", "backward", "up", "down").
     * @return True if the action was successful, false otherwise.
     */
    suspend fun scroll(nodeId: String, direction: String): Boolean

    /**
     * Inspects the current screen and returns a tree of all UI nodes.
     * @return The root node of the UI tree, or null if the screen is inaccessible.
     */
    suspend fun inspect(): NodeInfo?
}

// Data classes for API communication
data class Selector(val type: String, val value: String)
data class NodeInfo(val nodeId: String, val text: String?, val resourceId: String?)
