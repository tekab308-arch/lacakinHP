package com.lacakhp.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SmsHelperTests {

    @Test
    fun authorizesWhitelistOrExplicitPinOnly() {
        assertEquals("628123456789", SmsHelper.normalizePhone("0812-3456-789"))
        assertTrue(SmsHelper.isAuthorizedSender("+628123456789", "08123456789", "LACAK"))
        assertFalse(SmsHelper.isAuthorizedSender("+628999999999", "", "LACAK"))
        assertTrue(SmsHelper.isAuthorizedSender("+628999999999", "", "LACAK 7492"))
    }

    @Test
    fun parsesEmergencyCommands() {
        assertEquals(SmsCommandType.LOCATE, SmsHelper.parseCommand("lacak 7492", "LACAK 7492"))
        assertEquals(SmsCommandType.LOCK, SmsHelper.parseCommand("LACAK 7492 KUNCI", "LACAK 7492"))
        assertEquals(SmsCommandType.RING, SmsHelper.parseCommand("LACAK 7492 BUNYI", "LACAK 7492"))
        assertEquals(SmsCommandType.STATUS, SmsHelper.parseCommand("LACAK 7492 STATUS", "LACAK 7492"))
        assertNull(SmsHelper.parseCommand("LACAK 0000", "LACAK 7492"))
    }
}
