/*
 * Copyright (C) 2018 Infinite Automation Software. All rights reserved.
 */
package com.infiniteautomation.ui.rest;

import java.util.TimeZone;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import com.infiniteautomation.ui.UILifecycle;
import com.serotonin.m2m2.Common;
import com.serotonin.m2m2.ICoreLicense;
import com.serotonin.m2m2.db.dao.JsonDataDao;
import com.serotonin.m2m2.db.dao.SystemSettingsDao;
import com.serotonin.m2m2.vo.User;
import com.serotonin.m2m2.vo.json.JsonDataVO;
import com.serotonin.m2m2.web.mvc.rest.v1.ModulesRestController;
import com.serotonin.m2m2.web.mvc.rest.v1.TranslationsController;
import com.serotonin.m2m2.web.mvc.rest.v1.TranslationsController.TranslationsModel;
import com.serotonin.m2m2.web.mvc.rest.v1.model.jsondata.JsonDataModel;
import com.serotonin.m2m2.web.mvc.rest.v1.model.modules.AngularJSModuleDefinitionGroupModel;
import com.serotonin.m2m2.web.mvc.rest.v1.model.user.UserModel;
import com.serotonin.provider.Providers;

import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;

/**
 * Returns a conglomeration of data for use in the UI module AngularJS application bootstrap process.
 *
 * @author Jared Wiltshire
 */
@Api(value="UI application bootstrap")
@RestController
@RequestMapping("/ui-bootstrap")
public class BootstrapController {

    private static final String[] PUBLIC_TRANSLATIONS = new String[] {"login", "header"};
    private static final String[] PRIVATE_TRANSLATIONS = new String[] {"ui", "common", "pointEdit", "rest", "footer", "dateAndTime"};

    private final JsonDataDao jsonDataDao;
    private final SystemSettingsDao systemSettingsDao;

    @Autowired
    public BootstrapController(JsonDataDao jsonDataDao) {
        this.jsonDataDao = jsonDataDao;
        this.systemSettingsDao = SystemSettingsDao.instance;
    }

    @ApiOperation(value = "Get the data needed before logging in")
    @RequestMapping(method = RequestMethod.GET, path = "/pre-login")
    public PreLoginData preLogin(@AuthenticationPrincipal User user) {
        PreLoginData data = new PreLoginData();

        data.setAngularJsModules(ModulesRestController.getAngularJSModules());

        JsonDataVO uiSettings = this.jsonDataDao.getByXid(UILifecycle.MA_UI_SETTINGS_XID);
        if (uiSettings != null) {
            data.setUiSettings(new JsonDataModel(uiSettings));
        }

        data.setServerTimezone(TimeZone.getDefault().getID());
        data.setServerLocale(Common.getLocale().toLanguageTag());
        data.setLastUpgradeTime(Common.getLastUpgradeTime());

        if (user != null) {
            data.setUser(new UserModel(user));
            data.setTranslations(TranslationsController.getTranslations(PUBLIC_TRANSLATIONS, user.getLocaleObject()));
        } else {
            data.setTranslations(TranslationsController.getTranslations(PUBLIC_TRANSLATIONS, Common.getLocale()));
        }

        return data;
    }

    @ApiOperation(value = "Get the data needed after logging in")
    @RequestMapping(method = RequestMethod.GET, path = "/post-login")
    @PreAuthorize("isAuthenticated()")
    public PostLoginData postLogin(@AuthenticationPrincipal User user) {
        PostLoginData data = new PostLoginData();

        data.setInstanceDescription(systemSettingsDao.getValue(SystemSettingsDao.INSTANCE_DESCRIPTION));
        data.setGuid(Providers.get(ICoreLicense.class).getGuid());
        data.setCoreVersion(Common.getVersion().toString());

        JsonDataVO menuData = this.jsonDataDao.getByXid(UILifecycle.MA_UI_MENU_XID);
        JsonDataVO pageData = this.jsonDataDao.getByXid(UILifecycle.MA_UI_PAGES_XID);

        if (menuData != null) {
            data.setMenu(new JsonDataModel(menuData));
        }
        if (pageData != null) {
            data.setPages(new JsonDataModel(pageData));
        }

        data.setTranslations(TranslationsController.getTranslations(PRIVATE_TRANSLATIONS, user.getLocaleObject()));

        return data;
    }

    public static class PreLoginData {
        private AngularJSModuleDefinitionGroupModel angularJsModules;
        private JsonDataModel uiSettings;
        private String serverTimezone;
        private String serverLocale;
        private TranslationsModel translations;
        private int lastUpgradeTime;
        private UserModel user;

        public TranslationsModel getTranslations() {
            return translations;
        }
        public void setTranslations(TranslationsModel translations) {
            this.translations = translations;
        }
        public AngularJSModuleDefinitionGroupModel getAngularJsModules() {
            return angularJsModules;
        }
        public void setAngularJsModules(AngularJSModuleDefinitionGroupModel angularJsModules) {
            this.angularJsModules = angularJsModules;
        }
        public String getServerTimezone() {
            return serverTimezone;
        }
        public void setServerTimezone(String serverTimezone) {
            this.serverTimezone = serverTimezone;
        }
        public String getServerLocale() {
            return serverLocale;
        }
        public void setServerLocale(String serverLocale) {
            this.serverLocale = serverLocale;
        }
        public int getLastUpgradeTime() {
            return lastUpgradeTime;
        }
        public void setLastUpgradeTime(int lastUpgradeTime) {
            this.lastUpgradeTime = lastUpgradeTime;
        }
        public UserModel getUser() {
            return user;
        }
        public void setUser(UserModel user) {
            this.user = user;
        }
        public JsonDataModel getUiSettings() {
            return uiSettings;
        }
        public void setUiSettings(JsonDataModel uiSettings) {
            this.uiSettings = uiSettings;
        }
    }

    public static class PostLoginData {
        private String instanceDescription;
        private String guid;
        private String coreVersion;
        private JsonDataModel menu;
        private JsonDataModel pages;
        private TranslationsModel translations;

        public String getInstanceDescription() {
            return instanceDescription;
        }
        public void setInstanceDescription(String instanceDescription) {
            this.instanceDescription = instanceDescription;
        }
        public String getGuid() {
            return guid;
        }
        public void setGuid(String guid) {
            this.guid = guid;
        }
        public JsonDataModel getMenu() {
            return menu;
        }
        public void setMenu(JsonDataModel menu) {
            this.menu = menu;
        }
        public JsonDataModel getPages() {
            return pages;
        }
        public void setPages(JsonDataModel pages) {
            this.pages = pages;
        }
        public TranslationsModel getTranslations() {
            return translations;
        }
        public void setTranslations(TranslationsModel translations) {
            this.translations = translations;
        }
        public String getCoreVersion() {
            return coreVersion;
        }
        public void setCoreVersion(String coreVersion) {
            this.coreVersion = coreVersion;
        }

    }
}
