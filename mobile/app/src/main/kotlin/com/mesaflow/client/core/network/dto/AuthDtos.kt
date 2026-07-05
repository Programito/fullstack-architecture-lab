package com.mesaflow.client.core.network.dto

import kotlinx.serialization.Serializable

/* DTOs espejo de backend/src/identity/presentation/rest/dto (contrato /api/v1/auth). */

@Serializable
data class LoginRequestDto(
    val email: String,
    val password: String,
)

@Serializable
data class DemoLoginRequestDto(
    val role: String,
)

@Serializable
data class UserDto(
    val id: String,
    val email: String,
    val firstName: String? = null,
    val lastName: String? = null,
)

@Serializable
data class ScopesDto(
    val organizations: List<String> = emptyList(),
    val restaurants: List<String> = emptyList(),
)

@Serializable
data class AuthResponseDto(
    val accessToken: String,
    val tokenType: String = "Bearer",
    val expiresIn: Long = 0,
    val user: UserDto,
    val permissions: List<String> = emptyList(),
    val roles: List<String> = emptyList(),
    val scopes: ScopesDto = ScopesDto(),
)

@Serializable
data class DemoRoleDto(
    val role: String,
    val label: String = "",
    val description: String = "",
    val icon: String = "",
)

@Serializable
data class PublicConfigDto(
    val demoLoginEnabled: Boolean = false,
    val demoRoles: List<DemoRoleDto> = emptyList(),
)
