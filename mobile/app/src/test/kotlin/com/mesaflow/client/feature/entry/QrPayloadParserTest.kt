package com.mesaflow.client.feature.entry

import com.mesaflow.client.core.model.TableContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class QrPayloadParserTest {

    @Test
    fun `parsea una URL https valida`() {
        val result = QrPayloadParser.parse("https://mesaflow.app/t/rest-centro/mesa-12")
        assertEquals(TableContext("rest-centro", "mesa-12"), result)
    }

    @Test
    fun `parsea el esquema propio mesaflow`() {
        val result = QrPayloadParser.parse("mesaflow://t/rest-centro/mesa-12")
        assertEquals(TableContext("rest-centro", "mesa-12"), result)
    }

    @Test
    fun `tolera espacios y barra final`() {
        val result = QrPayloadParser.parse("  https://mesaflow.app/t/rest-1/mesa-1/  ")
        assertEquals(TableContext("rest-1", "mesa-1"), result)
    }

    @Test
    fun `rechaza URLs que no son de mesa`() {
        assertNull(QrPayloadParser.parse("https://mesaflow.app/otra/cosa"))
        assertNull(QrPayloadParser.parse("https://mesaflow.app/t/solo-restaurante"))
    }

    @Test
    fun `rechaza contenidos arbitrarios`() {
        assertNull(QrPayloadParser.parse("hola mundo"))
        assertNull(QrPayloadParser.parse(""))
        assertNull(QrPayloadParser.parse(null))
    }
}
