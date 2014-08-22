﻿/*!
  Microsoft LightSwitch JavaScript Library v2.0.0
  Copyright (C) Microsoft Corporation. All rights reserved.
*/

(function (window, undefined) {

"use strict";

var Object = window.Object,
    WinJS = window.WinJS,
    jQuery = window.jQuery, $ = jQuery,
    Globalize = window.Globalize,
    msls = Object.create({}),
    msls_setTimeout = window.setTimeout,
    msls_clearTimeout = window.clearTimeout;

var msls_isLibrary,
    msls_rootUri,
    msls_appRootUri,
    msls_appOptions,
    msls_getClientParameter,
    msls_isFunction,
    msls_isSameValue,
    msls_setProperty,
    msls_expose,
    msls_getUrlParameter;

(function () {
    var objectToString = Object.prototype.toString,
        externalRoot = Object.getPrototypeOf(msls) !==
            Object.prototype ? Object.getPrototypeOf(msls) : null;

    msls_isLibrary = !window.msls;

    var wLoc = window.location;
    var wLocNoQueryString = wLoc.protocol + "//" + wLoc.host + wLoc.pathname;
    msls_rootUri = wLocNoQueryString.substring(0, wLocNoQueryString.lastIndexOf("/"));
    msls_appRootUri = msls_rootUri.substring(0, msls_rootUri.lastIndexOf("/"));

    msls_appOptions = {
        enableModalScrollRegions: null,
        showContentBehindDialog: null,
        transitionAnimationLevel: null
    };

    msls_getUrlParameter =
    function getUrlParameter(url, parameterName) {
        var pattern = "[\\?&]" + parameterName + "=([^&#]*)";
        var regularExpression = new RegExp(pattern);
        var results = regularExpression.exec(url);
        return results ? results[1] : null;
    };

    function getCookieValue(cookieString, valueName, valueSeparator, decode) {

        if (!cookieString || !valueName) {
            return null;
        }

        var values = cookieString.split(valueSeparator), i, len, value, j;

        for (i = 0, len = values.length; i < len; i++) {
            value = values[i];
            j = value.indexOf("=");

            if (j > 0) {
                if ($.trim(value.substr(0, j)) === valueName) {
                    var retval = value.substr(j + 1);

                    if (decode) {
                        retval = decodeURIComponent(retval);
                    }

                    return retval;
                }
            }
        }

        return null;
    }

    function getAllCookieValues(cookieString, valueSeparator) {

        var retval = {};
        if (!cookieString) {
            return retval;
        }

        var values = cookieString.split(valueSeparator), i, j, value;
        for (i = 0; i < values.length; i++) {
            value = values[i];
            j = value.indexOf("=");

            if (j > 0) {
                retval[$.trim(value.substr(0, j))] = value.substr(j + 1);
            }
        }

        return retval;
    }

    msls_getClientParameter =
    function getClientParameter(parameterName) {

        if (!parameterName) {
            return null;
        }

        var clientParameterValue = msls_getUrlParameter(window.location.href, parameterName);
        if (clientParameterValue) {
            return clientParameterValue;
        }

        var clientParametersCookieName = "msls-client-parameters";
        var cookieString, parametersCookieValue, parametersCookieInnerValues;

        cookieString = document.cookie;

        parametersCookieValue = getCookieValue(cookieString, clientParametersCookieName, ";", true);
        if (parametersCookieValue) {
            parametersCookieInnerValues = getAllCookieValues(parametersCookieValue, "&");
            clientParameterValue = parametersCookieInnerValues[parameterName];
        }

        return clientParameterValue;
    };

    msls_isFunction =
    function isFunction(o) {
        return !!o && objectToString.call(o) === "[object Function]";
    };

    msls_isSameValue =
    function isSameValue(o1, o2) {
        var result = o1 === o2;
        if (!result && !!o1 && !!o2 &&
            !!o1.valueOf && o1.valueOf === o2.valueOf) {
            result = o1.valueOf() === o2.valueOf();
        }
        return result;
    };

    msls_setProperty =
    function setProperty(o, name, value, hidden) {
        if (name.charCodeAt(0) !== /*_*/95 && !hidden) {
            o[name] = value;
        } else if (!Object.prototype.hasOwnProperty.call(o, name)) {
            Object.defineProperty(o, name, {
                configurable: true, enumerable: !msls_isLibrary,
                writable: true, value: value
            });
        } else {
            o[name] = value;
        }
    };

    msls_expose =
    function expose(name, o, deprecated) {
        if (externalRoot) {
            msls_setProperty(externalRoot, name, o, deprecated);
        }
    };
}());

var msls_dispatch;

(function () {

    var _setTimeoutNative = window.setTimeout,
        _clearTimeoutNative = window.clearTimeout;


    var timerTickInterval = 100,
        maxIdleTicks = 30, // 3 Seconds
        timerTicks = 0,
        timerHandle,
        isTimerRunning = false,
        activeTimers = [];

    function _timerCallback() {

        if (++timerTicks === maxIdleTicks) {
            clearInterval(timerHandle);
            isTimerRunning = false;
        }

        while (activeTimers.length) {
            var info = activeTimers.shift(),
                invokeTime = info.invokeTime,
                oldNativeHandle = info.nativeHandle;
            info.nativeHandle = _setTimeoutNative(info.action, Math.max(invokeTime - Date.now(), 0), info.args);
            if (oldNativeHandle) {
                _clearTimeoutNative(oldNativeHandle);
            }
        }
    }

    function _startTimer() {
        if (!isTimerRunning) {
            timerHandle = setInterval(_timerCallback, timerTickInterval);
            isTimerRunning = true;
        }
        timerTicks = 0;
    }


    function setTimeoutFixed(handler, timeout, args) {

        var info = {
            action: handler,
            invokeTime: Date.now() + (timeout || 0),
            args: args,
            invoked: false,
            nativeHandle: null
        };

        if (!isTimerRunning) {
            info.nativeHandle = _setTimeoutNative(handler, timeout, args);
            return info;
        }

        activeTimers.push(info);

        if (Date.now() - info.invokeTime > timerTickInterval) {
            _startTimer();
        } else {
            info.nativeHandle = _setTimeoutNative(function () {
                if (!info.invoked) {
                    info.invoked = true;
                    info.action();
                    var index = activeTimers.indexOf(info);
                    activeTimers.splice(index, 1);
                } else {
                }
            }, timeout, args);
        }
        return info;
    }

    function clearTimeoutFixed(handle) {
        var index;

        if (handle.nativeHandle) {
            _clearTimeoutNative(handle.nativeHandle);
            handle.nativeHandle = null;
        }
        index = activeTimers.indexOf(handle);
        if (index !== -1) {
            activeTimers.splice(index, 1);
        }
    }

    if (navigator.userAgent.match(/OS 6(_\d)+/i)) {
        msls_setTimeout = setTimeoutFixed;
        msls_clearTimeout = clearTimeoutFixed;
        window.addEventListener("touchstart", _startTimer, true);
        window.addEventListener("touchend", _startTimer, true);
    }


    var actions = [],
        dispatching = false;

    function doDispatch() {
        dispatching = true;
        try {
            while (actions.length) {
                actions.shift()();
            }
        } finally {
            dispatching = false;
        }
    }

    msls_dispatch =
    function dispatch(action) {

        actions.push(action);
        if (actions.length === 1 && !dispatching) {
            msls_setTimeout(doDispatch, 0);
        }
    };

}());

var msls_dataProperty,
    msls_accessorProperty,
    msls_addToInternalNamespace,
    msls_defineClass,
    msls_mixIntoExistingClass,
    msls_defineEnum,
    msls_isEnumValueDefined;

(function () {

    msls_dataProperty =
    function dataProperty(value) {
        if (value && typeof (value) === "object" &&
            ("value" in value || "get" in value)) {
            value = { value: value };
        }
        return value;
    };

    msls_accessorProperty =
    function accessorProperty(get, set) {
        return { get: get, set: set };
    };

    function processMembers(members) {
        if (!members) {
            return {};
        }
        var standardMembers = {},
            keys = Object.keys(members), key, member;
        for (var i = 0, len = keys.length; i < len; i++) {
            key = keys[i];
            member = members[key];
            if (!member || typeof (member) !== "object" ||
                !("value" in member || "get" in member ||
                msls_isFunction(member.defineOn))) {
                standardMembers[key] = member;
            } else {
                if (member.configurable === undefined) {
                    member.configurable = true;
                }
                if (!msls_isLibrary) {
                    member.enumerable = true;
                }
                if (!member.get && member.writable === undefined) {
                    member.writable = true;
                }
                if (!msls_isFunction(member.defineOn)) {
                    standardMembers[key] = member;
                } else {
                    if (member.enumerable === undefined) {
                        member.enumerable = key.charCodeAt(0) !== /*_*/95;
                    }
                }
            }
        }
        return standardMembers;
    }

    function defineExtendedMembers(o, members) {
        if (!members) {
            return;
        }
        var keys = Object.keys(members), key, member;
        for (var i = 0, len = keys.length; i < len; i++) {
            key = keys[i];
            member = members[key];
            if (member && typeof (member) === "object" &&
                msls_isFunction(member.defineOn)) {
                member.defineOn(o, key);
            }
        }
    }

    function addToNamespaceCore(parent, path, members) {
        var standardMembers = processMembers(members),
            ns = WinJS.Namespace.defineWithParent(
                parent, path, standardMembers);
        defineExtendedMembers(ns, members);
        return ns;
    }

    msls_addToInternalNamespace =
    function addToInternalNamespace(path, members) {
        if (!path) {
            return addToNamespaceCore({ msls: msls }, "msls", members);
        } else {
            return addToNamespaceCore(msls, path, members);
        }
    };

    msls_defineClass =
    function defineClass(parent, className,
        constructor, baseClass, instanceMembers, staticMembers) {
        var standardInstanceMembers = processMembers(instanceMembers),
            standardStaticMembers = processMembers(staticMembers);
        if (!baseClass) {
            WinJS.Class.define(constructor,
                standardInstanceMembers, standardStaticMembers);
        } else {
            WinJS.Class.derive(baseClass, constructor,
                standardInstanceMembers, standardStaticMembers);
        }
        defineExtendedMembers(constructor.prototype, instanceMembers);
        defineExtendedMembers(constructor, staticMembers);
        if (className) {
            var namespaceContent = {};
            namespaceContent[className] = constructor;
            if (!parent || typeof (parent) === "string") {
                msls_addToInternalNamespace(parent, namespaceContent);
            } else {
                addToNamespaceCore({ _: parent }, "_", namespaceContent);
            }
        }
        return constructor;
    };

    msls_mixIntoExistingClass = function mixIntoExistingClass(constructor) {
        var standardArguments = [constructor], i, len;
        for (i = 1, len = arguments.length; i < len; i++) {
            standardArguments.push(processMembers(arguments[i]));
        }
        WinJS.Class.mix.apply(null, standardArguments);
        for (i = 1, len = arguments.length; i < len; i++) {
            defineExtendedMembers(constructor.prototype, arguments[i]);
        }
    };

    msls_defineEnum =
    function defineEnum(parent, definition) {
        var enumName = Object.keys(definition)[0],
            enumeration = definition[enumName];
        var ns, namespaceContent = {};
        namespaceContent[enumName] = msls_dataProperty(enumeration);
        if (!parent || typeof (parent) === "string") {
            ns = msls_addToInternalNamespace(parent, namespaceContent);
        } else {
            ns = addToNamespaceCore({ _: parent }, "_", namespaceContent);
        }
        return enumeration;
    };

    msls_isEnumValueDefined =
    function isEnumValueDefined(enumeration, value) {
        if (enumeration) {
            for (var propertyName in enumeration) {
                if (enumeration[propertyName] === value) {
                    return true;
                }
            }
        }
        return false;
    };

    msls_expose("_addToNamespace", function addToNamespace(path, members) {
        var ns = addToNamespaceCore(window, path, members);
        return ns;
    });

}());

var msls_event,
    msls_dispatchEventOverride;

(function () {

    var winJSUtilities = WinJS.Utilities;

    function defineEventOn(target, eventName) {
        var descriptor = this,
            eventMixin = winJSUtilities.eventMixin;
        if (!target.addEventListener) {
            target.addEventListener = eventMixin.addEventListener;
        }
        if (!target.dispatchEvent) {
            Object.defineProperty(target, "dispatchEvent", {
                configurable: true, enumerable: !msls_isLibrary,
                writable: true, value: eventMixin.dispatchEvent
            });
        }
        if (!target.removeEventListener) {
            target.removeEventListener = eventMixin.removeEventListener;
        }
        if (!descriptor.noProperty) {
            Object.defineProperties(target,
                winJSUtilities.createEventProperties(eventName));
        }
    }

    msls_event =
    function createEvent(noProperty) {
        return { noProperty: noProperty, defineOn: defineEventOn };
    };

    function defineDispatchEventOverrideOn(target, propertyName) {
        var descriptor = this,
            baseDispatchEvent = target.dispatchEvent,
            derivedDispatchEvent = descriptor.value;
        Object.defineProperty(target, propertyName, {
            configurable: true, enumerable: !msls_isLibrary,
            writable: true, value: function dispatchEvent(type, details) {
                return derivedDispatchEvent.call(
                    this, type, details, baseDispatchEvent);
            }
        });
    }

    msls_dispatchEventOverride =
    function dispatchEventOverride(dispatchEvent) {
        return {
            value: dispatchEvent,
            defineOn: defineDispatchEventOverrideOn
        };
    };

}());

var msls_subscribe,
    msls_unsubscribe,
    msls_subscribeOnce,
    msls_notify;

(function () {

    var notifications = new (WinJS.Class.mix(null, WinJS.Utilities.eventMixin))();

    msls_subscribe =
    function subscribe(type, listener) {
        notifications.addEventListener(type, listener);
    };

    msls_unsubscribe =
    function unsubscribe(type, listener) {
        notifications.removeEventListener(type, listener);
    };

    msls_subscribeOnce =
    function subscribeOnce(type, listener) {
        function onNotify() {
            msls_unsubscribe(type, onNotify);
            listener.apply(this, arguments);
        }
        msls_subscribe(type, onNotify);
    };

    msls_notify =
    function notify(type, details) {
        notifications.dispatchEvent(type, details);
    };

    if (!!window.msls || window.__mslsTestMode) {
        msls_expose("subscribe", msls_subscribe);
        msls_expose("unsubscribe", msls_unsubscribe);
    }

}());

var msls_mark,
    msls_codeMarkers,
    msls_flushSuspendedCodeMarkers;

(function () {

    var isEnabled = !!window.__mslsTestMode,
        codeMarkerNotification = "codeMarkerNotification",
        suspendedMarkerNotifications = isEnabled ? [] : null;


    msls_mark =
    function mark(codeMarker, now) {

        if (!isEnabled) {
            return;
        }

        var markerNotification = {
            marker: codeMarker,
            time: now || new Date()
        };

        if (suspendedMarkerNotifications) {
            suspendedMarkerNotifications.push(markerNotification);
        } else {
            msls_notify(codeMarkerNotification, markerNotification);
        }
    };

    msls_flushSuspendedCodeMarkers =
    function flushSuspendedCodeMarkers() {
        if (isEnabled && !!suspendedMarkerNotifications) {
            suspendedMarkerNotifications.forEach(function (markerNotification) {
                msls_notify(codeMarkerNotification, markerNotification);
            });
            suspendedMarkerNotifications = null;
        }
    };

    function markIfExists(_codeMarker, _timing) {
        if (_timing) {
            msls_mark(_codeMarker, new Date(_timing));
        }
    }

    if (isEnabled) {
        var windowPerformance = window.performance,
            timing = windowPerformance &&
                windowPerformance.timing;
        if (timing) {
            markIfExists("Application.NavigationStart", timing.navigationStart);
            markIfExists("Application.ConnectServerStart", timing.connectStart);
            markIfExists("Application.ConnectServerReady", timing.connectEnd);
            markIfExists("Application.RequestHtml", timing.requestStart);
            markIfExists("Application.GetHtmlStart", timing.responseStart);
            markIfExists("Application.GetHtmlEnd", timing.responseEnd);
            markIfExists("Application.LoadDomStart", timing.domLoading);
            markIfExists("Application.DomParsed", timing.domInteractive);
        }
        if (window.startupTime) {
            msls_mark("Application.ScriptStart", window.startupTime);
        }
    }

    msls_codeMarkers = {

        applicationDomLoaded: "Application.LoadDomEnd",
        applicationRun: "Application.Run",

        dispatchStart: "DispatchOperationCodeQueue.Start",
        dispatchEnd: "DispatchOperationCodeQueue.End",

        loadResourcesStart: "LoadResources.Start",
        loadResourcesEnd: "LoadResources.End",

        loadModelStart: "LoadModel.Start",
        loadModelEnd: "LoadModel.End",
        parseModelStart: "ParseModel.Start",
        parseModelEnd: "ParseModel.End",
        processModelStart: "ProcessModel.Start",
        processModelEnd: "ProcessModel.End",

        loadSharePointStart: "LoadSharePoint.Start",
        loadSharePointEnd: "LoadSharePoint.End",

        queryDataStart: "QueryData.Start",
        queryDataEnd: "QueryData.End",
        queryDataApplyEnd: "QueryData.ApplyEnd",
        saveDataStart: "SaveData.Start",
        saveDataEnd: "SaveData.End",

        loadScreenStart: "LoadScreen.Start",
        loadScreenEnd: "LoadScreen.End",
        pageActivationStart: "PageActivation.Start",
        pageActivationEnd: "PageActivation.End",
        createPageStart: "CreatePage.Start",
        createPageEnd: "CreatePage.End",
        navigationStart: "Navigation.Start",
        navigationEnd: "Navigation.End",
        navigationBackEnd: "NavigationBack.End",

        cleanNavigationStackStart: "CleanNavigationStack.Start",
        cleanNavigationStackEnd: "CleanNavigationStack.End",

        transitionPrepare: "Transition.Prepare",
        transitionStart: "Transition.Start",
        transition_Stage1Start: "Transition_Stage1.Start",
        transition_Stage2Start: "Transition_Stage2.Start",
        transition_Stage3Start: "Transition_Stage3.Start",
        transition_CleanupStart: "Transition_Cleanup.Start",
        transitionEnd: "Transition.End",

        fillCollectionStart: "FillCollection.Start",
        fillCollectionEnd: "FillCollection.End",

        controlViewCreating: "ControlViewCreating",
        controlViewCreated: "ControlViewCreated",

        listViewLoadStart: "ListViewLoad.Start",
        listViewLoadDataLoaded: "ListViewLoad.DataLoaded",
        listViewLoadApplyEnd: "ListViewLoad.ApplyEnd",
        listViewLoadLoadMore: "ListViewLoad.LoadMore",
        listViewLoadEnhanceView: "ListViewLoad.EnhanceView",
        listViewLoadEnd: "ListViewLoad.End",

        listItemClicked: "ItemClicked",
        listSelectedItemChanged: "SelectedItemChanged",

        tableLoadStart: "TableLoad.Start",
        tableLoadDataLoaded: "TableLoad.DataLoaded",
        tableLoadApplyEnd: "TableLoad.ApplyEnd",
        tableLoadLoadMore: "TableLoad.LoadMore",
        tableLoadEnhanceView: "TableLoad.EnhanceView",
        tableLoadEnd: "TableLoad.End",

        tableItemClicked: "TableItemClicked",
        tableSelectedItemChanged: "TableSelectedItemChanged",

        modalViewShowStart: "ModalViewShow.Start",
        modalViewShowEnd: "ModalViewShow.End",
        modalViewCloseStart: "ModalViewClose.Start",
        modalViewCloseEnd: "ModalViewClose.End",

        userTap: "User.Tap",
        executeActionStart: "ExecuteAction.Start",
        executeActionEnd: "ExecuteAction.End",

        layoutPartialRequest: "Layout.PartialReq",
        layoutFullRequest: "Layout.FullReq",
        layoutStart: "Layout.Start",
        layoutEnd: "Layout.End",
        layoutEndNotified: "Layout.EndNotified",

        updateAttachedLabelsStart: "UpdateLabels.Start",
        updateAttachedLabelsEnd: "UpdateLabels.End",

        goUrlStart: "GoUrl.Start",
        goUrlEnd: "GoUrl.End",
        changePageStart: "ChangePage.Start",
        changePageEnd: "ChangePage.End",

        createTemplateStart: "CreateTemplate.Start",
        createTemplateEnd: "CreateTemplate.End",
        createPageControlsStart: "CreatePageControls.Start",
        createPageControlsEnd: "CreatePageControls.End",

        getPopupContentStart: "GetPopupContent.Start",
        getPopupContentEnd: "GetPopupContent.End",
        openPopupStart: "OpenPopup.Start",
        openPopupEnd: "OpenPopup.End",
        closePopupStart: "ClosePopup.Start",
        closePopupEnd: "ClosePopup.End",
        createPopupStart: "CreatePopup.Start",
        createPopupEnhance: "CreatePopup.Enhance",
        createPopupEnd: "CreatePopup.End",

        progressShow: "Progress.Show",
        progressHide: "Progress.Hide"
    };
}());

var msls_getValues;

(function () {

    msls_getValues =
    function getValues(o) {
        return Object.keys(o).map(function (key) {
            return o[key];
        });
    };

}());

var msls_Sequence,
    msls_iterate;

(function () {

    msls_defineClass(msls, "Sequence", function Sequence() {
    }, null, {
        array: msls_accessorProperty(
            function array_get() {
                var array = [];
                this.each(function () {
                    array.push(this);
                });
                return array;
            }
        ),
        each: function each(callback) {
            var iterator = this._iterator ? this._iterator() : null, item;
            if (iterator) {
                while (iterator.next()) {
                    item = iterator.item();
                    if (callback.call(item, item) === false) {
                        break;
                    }
                }
            }
        }
    });
    msls_Sequence = msls.Sequence;

    msls_defineClass(msls_Sequence, "Array", function Sequence_Array(array) {
        msls_Sequence.call(this);
        msls_setProperty(this, "_array", array);
    }, msls_Sequence, {
        _iterator: function iterator() {
            return new ArrayIterator(this._array);
        }
    });
    function ArrayIterator(array) {
        this._array = array;
        this._length = array.length;
        this._index = -1;
    }
    ArrayIterator.prototype.next = function next() {
        return ++this._index < this._length;
    };
    ArrayIterator.prototype.item = function item() {
        return this._array[this._index];
    };

    msls_iterate =
    function iterate(array) {
        var s = new msls_Sequence.Array(array);
        return s;
    };

    msls_expose("Sequence", msls_Sequence);
    msls_expose("iterate", msls_iterate);

}());

var msls_changeEventType = "change",
    msls_makeObservable,
    msls_observableProperty,
    msls_makeObservableProperty,
    msls_computedProperty;

(function () {

    var activeComputationStack = [],
        changesToDispatch;

    function trackAccess(o, propertyName) {
        if (activeComputationStack.length) {
            var dependentsBag = o._dependents || {},
                dependents = dependentsBag[propertyName];
            if (!dependents) {
                msls_setProperty(o, "_dependents", dependentsBag);
                dependents = dependentsBag[propertyName] = [];
            }
            dependents.push(activeComputationStack[
                activeComputationStack.length - 1]);
        }
    }

    function beginTracking(o, propertyName, version) {
        var trackingStub = o._trackingStub;
        if (!trackingStub) {
            msls_setProperty(o, "_trackingStub", trackingStub = { o: o });
        }
        activeComputationStack.push({
            trackingStub: trackingStub, name: propertyName, version: version
        });
    }

    function endTracking() {
        activeComputationStack.pop();
    }

    function invalidate(dependent) {
        var o = dependent.trackingStub.o,
            propertyName,
            computeStates,
            computeState;
        if (o) {
            propertyName = dependent.name;
            computeStates = o._computeStates;
            computeState = computeStates[propertyName];
            if (computeState.version === dependent.version) {
                computeState.isComputed = false;
                o.dispatchChange(propertyName);
            }
        }
    }

    function getChangeEventType(propertyName) {
        var eventType = msls_changeEventType;
        if (propertyName) {
            eventType = propertyName + "_" + eventType;
        }
        return eventType;
    }

    function dispatchChangeEvent(change) {
        var target = change.target, propertyName = change.propertyName;
        target.dispatchEvent(getChangeEventType(propertyName), propertyName);
        target.dispatchEvent(msls_changeEventType, propertyName);
    }

    function addChangeListener(propertyName, listener) {
        this.addEventListener(getChangeEventType(propertyName), listener);
    }

    function dispatchChange(propertyName) {
        var isInitiator = !changesToDispatch,
            dependentsBag = this._dependents,
            dependents = (dependentsBag ?
                dependentsBag[propertyName] : null),
            changes, change = {
                target: this, propertyName: propertyName
            };
        if (!!dependents && !!dependents.length) {
            if (isInitiator) {
                changesToDispatch = [];
            }
            changesToDispatch.push(change);
            dependentsBag[propertyName] = [];
            for (var i = 0, len = dependents.length; i < len; i++) {
                invalidate(dependents[i]);
            }
            if (isInitiator) {
                changes = changesToDispatch;
                changesToDispatch = null;
                for (i = 0, len = changes.length; i < len; i++) {
                    change = changes[i];
                    dispatchChangeEvent(change);
                }
            }
        } else {
            if (!isInitiator) {
                changesToDispatch.push(change);
            } else {
                dispatchChangeEvent(change);
            }
        }
    }

    function removeChangeListener(propertyName, listener) {
        this.removeEventListener(getChangeEventType(propertyName), listener);
    }

    msls_makeObservable =
    function makeObservable(constructor) {
        var prototype = constructor.prototype;
        if (!("onchange" in prototype)) {
            msls_mixIntoExistingClass(constructor, {
                change: msls_event()
            });
        }
        if (!prototype.addChangeListener) {
            prototype.addChangeListener = addChangeListener;
        }
        if (!prototype.dispatchChange) {
            Object.defineProperty(prototype, "dispatchChange", {
                configurable: true, enumerable: !msls_isLibrary,
                writable: true, value: dispatchChange
            });
        }
        if (!prototype.removeChangeListener) {
            prototype.removeChangeListener = removeChangeListener;
        }
    };

    function defineObservablePropertyOn(target, propertyName) {
        var targetClass = target.constructor,
            descriptor = this, mixinContent = {},
            underlyingPropertyName, customGetter;

        msls_makeObservable(targetClass);

        mixinContent[getChangeEventType(propertyName)] = msls_event(true);
        if (!descriptor.get) {
            underlyingPropertyName = "__" + propertyName;
            if (descriptor.initialValue !== undefined) {
                mixinContent[underlyingPropertyName] = {
                    enumerable: !msls_isLibrary,
                    value: descriptor.initialValue
                };
            }
            mixinContent[propertyName] = msls_accessorProperty(
                function observableProperty_get() {
                    trackAccess(this, propertyName);
                    return this[underlyingPropertyName];
                },
                function observableProperty_set(value) {
                    if (this[underlyingPropertyName] !== value) {
                        msls_setProperty(this, underlyingPropertyName, value);
                        this.dispatchChange(propertyName);
                    }
                }
            );
        } else {
            customGetter = descriptor.get;
            mixinContent[propertyName] = msls_accessorProperty(
                function observableProperty_get() {
                    trackAccess(this, propertyName);
                    return customGetter.call(this);
                },
                descriptor.set
            );
        }
        if (typeof descriptor.enumerable === "boolean") {
            mixinContent[propertyName].enumerable = descriptor.enumerable;
        }
        msls_mixIntoExistingClass(targetClass, mixinContent);
    }

    msls_observableProperty =
    function observableProperty(initialValue, get, set) {
        return {
            get: get, set: set,
            initialValue: initialValue,
            defineOn: defineObservablePropertyOn
        };
    };

    msls_makeObservableProperty =
    function makeObservableProperty(descriptor) {
        descriptor.defineOn = defineObservablePropertyOn;
    };

    function defineComputedPropertyOn(target, propertyName) {
        var targetClass = target.constructor,
            descriptor = this, mixinContent = {},
            underlyingPropertyName = "__" + propertyName;
        mixinContent[propertyName] = msls_observableProperty(null,
            function computedProperty_get() {
                var me = this,
                    computeStates = me._computeStates || {},
                    computeState = computeStates[propertyName];
                if (!computeState) {
                    msls_setProperty(me, "_computeStates", computeStates);
                    computeState = computeStates[propertyName] = {
                        version: 0, isComputing: false, isComputed: false
                    };
                }
                if (!computeState.isComputing && !computeState.isComputed) {
                    beginTracking(me, propertyName, ++computeState.version);
                    computeState.isComputing = true;
                    try {
                        msls_setProperty(me, underlyingPropertyName,
                            descriptor.compute.call(me));
                        computeState.isComputed = true;
                    } finally {
                        computeState.isComputing = false;
                        endTracking();
                    }
                }
                return me[underlyingPropertyName];
            },
            descriptor.set
        );
        if (typeof descriptor.enumerable === "boolean") {
            mixinContent[propertyName].enumerable = descriptor.enumerable;
        }
        msls_mixIntoExistingClass(targetClass, mixinContent);
    }

    msls_computedProperty =
    function computedProperty(compute, set) {
        return {
            compute: compute, set: set,
            defineOn: defineComputedPropertyOn
        };
    };

}());

var msls_addLifetimeDependency,
    msls_removeLifetimeDependency,
    msls_addAutoDisposeEventListener,
    msls_addAutoDisposeChangeListener,
    msls_addAutoDisposeNotificationListener,
    msls_isDependentObject,
    msls_dispose,
    msls_isDisposed;


(function () {

    var changeListenerRemover,
        eventListenerRemover;


    msls_addLifetimeDependency =
    function addLifetimeDependency(host, dependent) {

        var dependencies = host.__dependencies;

        if (!dependencies) {
            msls_setProperty(host, "__dependencies", dependencies = []);
        }
        dependencies.push(dependent);

        msls_setProperty(dependent, "__sponsor", host);
    };

    msls_removeLifetimeDependency =
    function removeLifetimeDependency(dependent) {
        var host = dependent.__sponsor,
            dependencies;
        if (host && !host.__disposed) {
            dependencies = host.__dependencies;
            if (Array.isArray(dependencies)) {
                for (var i = dependencies.length - 1; i >= 0; i--) {
                    if (dependencies[i] === dependent) {
                        dependencies.splice(i, 1);
                        return;
                    }
                }
            }
        }
        if (host) {
            dependent.__sponsor = null;
        }
    };

    msls_isDependentObject =
    function isDependentObject(object) {
        return !!object.__sponsor;
    };


    msls_dispose =
    function dispose(object) {
        var current = object,
            lastDispose,
            onDispose,
            dependencies,
            dependent,
            i, len;

        if (!object) {
            return;
        }


        if (object.__disposed) {
            return;
        }



        while (current) {
            onDispose = current._onDispose;
            if (!onDispose) {
                break;
            }
            if (onDispose !== lastDispose) {
                try {
                    onDispose.call(object);
                }
                catch (exception) {
                }
                lastDispose = onDispose;
            }
            current = Object.getPrototypeOf(current);
        }

        dependencies = object.__dependencies;
        if (Array.isArray(dependencies)) {
            object.__dependencies = null;
            for (i = 0, len = dependencies.length; i < len; i++) {
                dependent = dependencies[i];
                msls_dispose(dependent);
                dependent.__sponsor = null;
            }
        }

        object._listeners = null;
        object._dependents = null;

        if (object._trackingStub) {
            object._trackingStub.o = null;
            object._trackingStub = null;
        }


        msls_setProperty(object, "__disposed", true);
    };

    msls_isDisposed =
    function isDisposed(object) {
        return !!object.__disposed;
    };

    msls_defineClass(msls, "AutoDisposeEventListener",
        function AutoDisposeEventListener(source, eventName, listener) {
            var me = this;
            me.source = source;
            me.eventName = eventName;
            me.listener = listener;
        }, null, {
            _onDispose: function _onDispose() {
                var me = this,
                    source = me.source;
                if (source) {
                    source.removeEventListener(me.eventName, me.listener);
                }
                msls_removeLifetimeDependency(me);
            }
        }
    );

    msls_addAutoDisposeEventListener =
    function addAutoDisposeEventListener(source, eventName, target, listener) {

        source.addEventListener(eventName, listener);
        var result = new msls.AutoDisposeEventListener(source, eventName, listener);
        msls_addLifetimeDependency(target, result);

        return result;
    };

    msls_defineClass(msls, "AutoDisposeChangeListener",
        function AutoDisposeChangeListener(source, propertyName, listener) {
            var me = this;
            me.source = source;
            me.propertyName = propertyName;
            me.listener = listener;
        }, null, {
            _onDispose: function _onDispose() {
                var me = this,
                    source = me.source;
                if (source.removeChangeListener) {
                    source.removeChangeListener(me.propertyName, me.listener);
                }
                msls_removeLifetimeDependency(me);
            }
        }
    );

    msls_addAutoDisposeChangeListener =
    function addAutoDisposeChangeListener(source, propertyName, target, listener) {

        source.addChangeListener(propertyName, listener);

        var result = new msls.AutoDisposeChangeListener(source, propertyName, listener);
        msls_addLifetimeDependency(target, result);
        return result;
    };

    msls_defineClass(msls, "AutoDisposeNotificationListener",
        function AutoDisposeNotificationListener(notificationType, listener) {
            var me = this;
            me.notificationType = notificationType;
            me.listener = listener;
        }, null, {
            _onDispose: function _onDispose() {
                var me = this;
                msls_unsubscribe(me.notificationType, me.listener);
                msls_removeLifetimeDependency(me);
            }
        }
    );

    msls_addAutoDisposeNotificationListener =
    function addAutoDisposeNotificationListener(notificationType, target, listener) {

        msls_subscribe(notificationType, listener);

        var result = new msls.AutoDisposeNotificationListener(notificationType, listener);
        msls_addLifetimeDependency(target, result);
        return result;
    };

}());

var msls_promiseOperation;

(function () {

    var operationCodeQueue = [],
        operationCodeQueueSuspended = 0,
        operationCodeQueueProcessing,
        ambientOperationStack = [];

    function queueOperationCode(operationCode) {
        operationCodeQueue.push(operationCode);
        if (operationCodeQueue.length === 1 &&
            !operationCodeQueueSuspended &&
            !operationCodeQueueProcessing) {
            msls_dispatch(processOperationCodeQueue);
        }
    }

    function processOperationCodeQueue() {
        msls_mark(msls_codeMarkers.dispatchStart);
        operationCodeQueueProcessing = true;
        while (operationCodeQueue.length) {
            operationCodeQueue.shift()();
            if (operationCodeQueueSuspended) {
                break;
            }
        }
        operationCodeQueueProcessing = false;
        msls_mark(msls_codeMarkers.dispatchEnd);
    }

    function pushAmbientOperation(operation, addNestedOperation) {
        ambientOperationStack.push([operation, addNestedOperation]);
    }

    function ambientOperation() {
        var len = ambientOperationStack.length;
        return len ? ambientOperationStack[len - 1][0] : null;
    }

    function registerNestedOperation(nestedOperation) {
        var len = ambientOperationStack.length,
            addNestedOperation = ambientOperationStack[len - 1][1];
        addNestedOperation(nestedOperation);
    }

    function popAmbientOperation() {
        ambientOperationStack.pop();
    }

    function suspendOperationCodeQueue() {
        operationCodeQueueSuspended++;
    }

    function resumeOperationCodeQueue() {
        operationCodeQueueSuspended--;
        if (!operationCodeQueueSuspended &&
            operationCodeQueue.length > 0 &&
            !operationCodeQueueProcessing) {
            msls_dispatch(processOperationCodeQueue);
        }
    }

    msls_promiseOperation = function promiseOperation(init, independent) {
        var operation,
            currentAmbientOperation = ambientOperation(),
            shouldBeNested = !!currentAmbientOperation && !independent,
            myOperationCodeQueue = [], myOperationCodeRunning = 0,
            nestedOperations = [], pendingInterleave = false,
            promiseObject, reportError, reportComplete, promiseCleanup;

        function operationSequenced() {
            return !myOperationCodeQueue;
        }

        function addNestedOperation(nestedOperation) {
            if (nestedOperations) {
                nestedOperations.push(nestedOperation);
            } else {
                nestedOperation.sequence();
            }
        }

        function sequenceOperation() {
            if (!operationSequenced()) {
                var queue = myOperationCodeQueue,
                    nestedOps = nestedOperations;
                myOperationCodeQueue = null;
                suspendOperationCodeQueue();
                while (nestedOps.length) {
                    nestedOps.shift().sequence();
                }
                while (queue.length) {
                    queue.shift()();
                }
                nestedOperations = null;
            }
        }

        if (shouldBeNested) {
            registerNestedOperation({
                sequence: sequenceOperation
            });
        }

        function makeOperationCode(code, immediate, rethrow) {
            if (!code) { return code; }
            return function operationCode() {
                var me = this, args = Array.prototype.slice.call(arguments, 0);
                function operationCodeCore(rethrowErrors) {
                    var error, result;
                    pushAmbientOperation(operation, addNestedOperation);
                    myOperationCodeRunning++;
                    try {
                        result = code.apply(me, args);
                    } catch (e) {
                        if (!rethrowErrors) {
                            operation.error(e);
                        } else {
                            error = e;
                        }
                    } finally {
                        myOperationCodeRunning--;
                        popAmbientOperation();
                    }
                    if (pendingInterleave) {
                        pendingInterleave = false;
                    } else {
                        sequenceOperation();
                    }
                    if (error) {
                        throw error;
                    }
                    return result;
                }
                if (!immediate && !operationSequenced() &&
                    !myOperationCodeRunning) {
                    myOperationCodeQueue.push(operationCodeCore);
                    queueOperationCode(function queuedOperationCode() {
                        if (!operationSequenced()) {
                            myOperationCodeQueue.shift()();
                        }
                    });
                    return null;
                } else {
                    return operationCodeCore(rethrow);
                }
            };
        }

        function endOperation(error, result) {
            if (!reportError && !reportComplete) {
                return;
            }
            if (ambientOperation() !== operation) {
                makeOperationCode(function endOperationCode() {
                    endOperation(error, result);
                })();
                return;
            }
            try {
                if (error) {
                    reportError(error);
                } else {
                    reportComplete(result);
                }
            } finally {
                reportError = reportComplete = null;
            }
        }

        operation = {
            promise: function promise() {
                return promiseObject;
            },
            code: function code(operationCode, rethrowErrors) {
                return makeOperationCode(operationCode, null, rethrowErrors);
            },
            interleave: function interleave() {
                if (ambientOperation() === operation) {
                    pendingInterleave = true;
                }
            },
            error: function error(value) {
                endOperation(value, null);
            },
            complete: function complete(value) {
                endOperation(null, value);
            }
        };

        promiseObject = Object.create(WinJS.Promise.prototype);
        msls_setProperty(promiseObject, "_sequence", sequenceOperation);
        promiseCleanup = promiseObject._cleanupAction;
        msls_setProperty(promiseObject, "_cleanupAction", function () {
            promiseCleanup.call(this);
            var resume = operationSequenced();
            myOperationCodeQueue = null;
            nestedOperations = null;
            if (resume) {
                resumeOperationCodeQueue();
            }
        });
        WinJS.Promise.call(promiseObject, function initialize(c, e) {
            var immediateInit;
            if (!init) {
                c();
            } else {
                reportError = e; reportComplete = c;
                immediateInit = !!currentAmbientOperation;
                makeOperationCode(init, immediateInit)
                    .call(operation, operation);
                init = null;
            }
        });

        return promiseObject;
    };

    function promiseThen(creator, thenPromise) {
        var sequence = creator._sequence;
        if (msls_isFunction(sequence)) {
            msls_setProperty(thenPromise, "_sequence", sequence);
            if (!!ambientOperation()) {
                registerNestedOperation({
                    sequence: sequence
                });
            }
        }
        return thenPromise;
    }

    function extendPromise(promise) {
        var proto = Object.getPrototypeOf(promise);

        if (proto._thenEx) {
            return;
        }

        WinJS.Class.mix(proto.constructor, {
            done: function done(c, e, p) {
                var currentAmbientOperation = ambientOperation();
                if (currentAmbientOperation) {
                    c = currentAmbientOperation.code(c, true);
                    e = currentAmbientOperation.code(e, true);
                    p = currentAmbientOperation.code(p, true);
                }

                if (this._done !== proto._done) {
                    this._done = proto._done;
                }



                this._done(c, e, p);
            },
            _done: proto.done,
            then: function then(c, e, p) {
                var currentAmbientOperation = ambientOperation();
                if (currentAmbientOperation) {
                    c = currentAmbientOperation.code(c, true);
                    e = currentAmbientOperation.code(e, true);
                    p = currentAmbientOperation.code(p, true);
                }

                if (this._then !== proto._then) {
                    this._then = proto._then;
                }



                return promiseThen(this, this._then(c, e, p));
            },
            _then: proto.then,
            _thenEx: function _thenEx(ce) {
                return this.then(
                    function onComplete(value) {
                        return ce(null, value);
                    },
                    function onError(value) {
                        return ce(value);
                    }
                );
            }
        });

    }
    extendPromise(WinJS.Promise.prototype);
    extendPromise(WinJS.Promise.wrapError(null));
    extendPromise(WinJS.Promise.wrap(null));

    msls_expose("promiseOperation", msls_promiseOperation);

}());

(function () {

    var _WhereSequence;

    msls_defineClass(msls, "WhereSequence", function WhereSequence(source, predicate) {
        msls_Sequence.call(this);
        msls_setProperty(this, "_source", source);
        msls_setProperty(this, "_predicate", predicate);
    }, msls_Sequence, {
        _iterator: function iterator() {
            return new WhereIterator(this);
        }
    });
    _WhereSequence = msls.WhereSequence;
    function WhereIterator(source) {
        this._iterator = source._source._iterator();
        this._predicate = source._predicate;
    }
    WhereIterator.prototype.next = function next() {
        var iterator = this._iterator,
            predicate = this._predicate, item;
        while (iterator.next()) {
            item = iterator.item();
            if (predicate.call(item, item)) {
                return true;
            }
        }
        return false;
    };
    WhereIterator.prototype.item = function item() {
        return this._iterator.item();
    };

    msls_mixIntoExistingClass(msls_Sequence, {
        all: function all(predicate) {
            return !this.any(function (item) {
                return !predicate.call(item, item);
            });
        },
        any: function any(predicate) {
            var result = false;
            this.each(function (item) {
                if (!predicate || predicate.call(item, item)) {
                    result = true;
                    return false;
                }
                return true;
            });
            return result;
        },
        first: function first(predicate) {
            var result;
            this.each(function (item) {
                if (!predicate || predicate.call(item, item)) {
                    result = item;
                    return false;
                }
                return true;
            });
            return result;
        },
        sum: function sum(predicate) {
            var result = 0;
            this.each(function (item) {
                result += (!predicate ? item : predicate.call(item, item));
            });
            return result;
        },
        where: function where(predicate) {
            return new _WhereSequence(this, predicate);
        }
    });

}());

var msls_stringFormat;

(function () {

    var replaceRE = /\{(\d+)\}/g;

    msls_stringFormat = function stringFormat(format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(replaceRE,
            function (s, p) { return args[p]; });
    };

}());

var msls_resourcesReady,
    msls_getString,
    msls_getResourceString;

(function () {

    var supportedLanguages = {},
        preferredLanguage,
        preferredNeutralLanguage,
        defaultLanguage,
        defaultNeutralLanguage,
        languages,
        readyPromise,
        libFile = "msls",
        files = [libFile, "client", "service"],
        f,
        resources = {},
        resourceIdRE = /^\/([^\/]+)\/([^\/]+)$/,
        globalizeScriptLocation;

    function readGlobalProperty(globalProperty, defaultValue) {
        var value = window[globalProperty];
        if (!value) {
            value = defaultValue;
        } else {
            window[globalProperty] = null;
        }
        return value;
    }

    function getNeutralLanguage(regionalLang) {
        return regionalLang.split("-", 1)[0];
    }

    function addToActiveLanguages(language) {
        if (supportedLanguages[language]) {
            languages.push(language);
        }
    }



    languages = readGlobalProperty("__msls_supportedLanguages", "EN-US");
    languages = languages.toUpperCase();
    languages = languages.split(";");
    $.each(languages, function (index, item) {
        item = $.trim(item);
        if (item) {
            supportedLanguages[item] = true;
        }
    });

    languages = [];

    preferredLanguage = msls_getClientParameter("preferredLanguage");
    preferredLanguage = preferredLanguage ? $.trim(preferredLanguage.toUpperCase()) : null;
    if (preferredLanguage) {
        addToActiveLanguages(preferredLanguage);
        preferredNeutralLanguage = getNeutralLanguage(preferredLanguage);
        if (preferredNeutralLanguage !== preferredLanguage) {
            addToActiveLanguages(preferredNeutralLanguage);
        }
    }

    defaultLanguage = readGlobalProperty("__msls_defaultLanguage", "EN-US");
    defaultLanguage = $.trim(defaultLanguage.toUpperCase());
    if (defaultLanguage !== preferredLanguage &&
        defaultLanguage !== preferredNeutralLanguage) {
        addToActiveLanguages(defaultLanguage);
        defaultNeutralLanguage = getNeutralLanguage(defaultLanguage);
        if (defaultNeutralLanguage !== defaultLanguage &&
            defaultNeutralLanguage !== preferredNeutralLanguage) {
            addToActiveLanguages(defaultNeutralLanguage);
        }
    }

    msls_mark(msls_codeMarkers.loadResourcesStart);
    readyPromise = new WinJS.Promise(function (complete, error) {
        var loading = 0,
            lang, i, j,
            lastAttemptMade = false,
            errorMessage = "";

        function loadCompleted() {
            var found = false,
                langName,
                isEnglishActive = false;
            loading--;
            if (!loading) {
                if (!lastAttemptMade) {
                    for (i = 0; i < languages.length; i++) {
                        langName = languages[i];
                        isEnglishActive = langName === "EN-US";
                        if (libFile in resources[langName]) {
                            found = true;
                            break;
                        }
                    }
                }
                if (!lastAttemptMade && !found) {
                    lastAttemptMade = true;
                    loading++;
                    if (!isEnglishActive) {
                        languages.push("EN-US");
                        resources["EN-US"] = {};
                    }
                    loadLocalizationResources("EN-US", libFile);
                } else {
                    msls_mark(msls_codeMarkers.loadResourcesEnd);
                    if (errorMessage) {
                        error(errorMessage);
                    } else {
                        complete();
                    }
                }
            }
        }

        function endsWith(value, pattern) {
            return value.length >= pattern.length && value.substr(value.length - pattern.length) === pattern;
        }

        function getCultureInfoUri(language) {

            if (!globalizeScriptLocation) {
                globalizeScriptLocation = "//ajax.aspnetcdn.com/ajax/globalize/0.1.1/cultures";
                $("script[type='text/javascript']").each(function () {
                    var src = $(this).attr("src"),
                        srcLower = src ? src.toLowerCase() : "";
                    if (endsWith(srcLower, "globalize.min.js") || endsWith(srcLower, "globalize.js")) {
                        var index = src.lastIndexOf("/");
                        if (index >= 0) {
                            globalizeScriptLocation = src.substr(0, index) + "/cultures";
                        } else {
                            globalizeScriptLocation = "cultures";
                        }
                        return false;
                    }
                    return;
                });
            }
            return globalizeScriptLocation + "/globalize.culture." + language + ".js";
        }

        function loadCultureInfo(language, cultureError) {

            function cultureInfoFailed() {
                if (cultureError) {
                    cultureError();
                }
            }

            loading++;
            var uri = getCultureInfoUri(language);
            $.ajax({
                url: uri,
                dataType: "script",
                cache: true,
                error: function () {
                    cultureInfoFailed();
                    loadCompleted();
                },
                success: function () {
                    var cultureName;
                    language = language.toUpperCase();
                    for (cultureName in Globalize.cultures) {
                        if (cultureName.toUpperCase() === language) {
                            Globalize.culture(cultureName);
                            break;
                        }
                    }
                    if (Globalize.culture().name.toUpperCase() !== language) {
                        cultureInfoFailed();
                    }
                    loadCompleted();
                }
            });
        }

        function loadResources(fileName, callback) {
            var uri = msls_rootUri + "/Content/Resources/" + fileName;
            $.ajax({
                url: uri,
                dataType: "text",
                cache: true,
                error: function () {
                    loadCompleted();
                },
                success: function (result) {
                    try {
                        result = $.parseJSON(result);
                        if (!(result instanceof Object)) {
                            throw "Invalid JSON.";
                        }
                        callback(result);
                    } catch (e) {
                        errorOccurred(msls_stringFormat(
                            "Failed to parse the resources JSON string. Failure reason: {0}", (e || "")));
                    }
                    finally {
                        loadCompleted();
                    }
                }
            });

            function errorOccurred(reason) {
                errorMessage += msls_stringFormat(
                    "Failed to load resources from {0}. {1}", uri, reason) + "\n";
            }

        }

        function makeHandler(langValue, fValue) {
            return function (r) {
                resources[langValue][fValue] = r;
            };
        }

        function loadLocalizationResources(langValue, fValue) {
            loadResources(fValue + ".lang-" + langValue + ".resjson", makeHandler(langValue, fValue));
        }


        if (!!preferredLanguage && preferredLanguage !== "EN") {
            loadCultureInfo(preferredLanguage, function tryPreferredNeutral() {
                if (!!preferredNeutralLanguage && preferredNeutralLanguage !== "EN" && preferredNeutralLanguage !== preferredLanguage) {
                    loadCultureInfo(preferredNeutralLanguage);
                }
            });
        }


        loading += languages.length * files.length;
        for (i = 0; i < languages.length; i++) {
            lang = languages[i];
            resources[lang] = {};
            for (j = 0; j < files.length; j++) {
                f = files[j];
                loadLocalizationResources(lang, f);
            }
        }

        if (!loading) {
            loading++;
            loadCompleted();
        }
    });

    msls_resourcesReady =
    function resourcesReady() {
        return readyPromise;
    };

    msls_getString =
    function getString(resourceId) {
        var value = resourceId,
            r = resourceIdRE.exec(resourceId),
            file,
            key,
            i,
            lang,
            s1,
            s2;

        if (r === null) {
            return { value: value, empty: true };
        }

        file = r[1].toLowerCase();
        key = r[2];

        for (i = 0; i < languages.length; i++) {
            lang = languages[i];
            if (file in (s1 = resources[lang]) &&
                key in (s2 = s1[file])) {
                value = s2[key];
                if (!!value && typeof (value) === "string") {
                    return { value: value, lang: lang };
                } else {
                    break;
                }
            }
        }

        return { value: value, empty: true };

    };

    msls_getResourceString = function getResourceString(key) {

        var r = msls_getString("/msls/" + key),
            s = r.value,
            args;


        if (!r.empty && arguments.length > 1) {
            args = Array.prototype.slice.call(arguments, 0);
            args[0] = s;
            s = msls_stringFormat.apply(null, args);
        }

        return s;
    };

    WinJS.Namespace.define("WinJS.Resources", {
        getString: msls_getString
    });

}());

var msls_throw,
    msls_throwError,
    msls_throwInvalidOperationError,
    msls_throwArgumentError,
    msls_throwIfFalsy;

(function () {

    msls_throw =
    function throwObject(error, properties) {
        if (!error.message) {
            error.message = msls_getResourceString("errors_core");
        }
        if ("description" in error) {
            error.description = error.message;
        }
        if (properties) {
            $.extend(error, properties);
        }
        throw error;
    };

    msls_throwError =
    function throwError(name, message, properties) {
        var error = new Error();
        if (name) {
            error.name = name;
        }
        if (message) {
            error.message = message;
        }
        msls_throw(error, properties);
    };

    msls_throwInvalidOperationError =
    function throwInvalidOperationError(message, properties) {
        if (!message) {
            message = msls_getResourceString("errors_invalid_operation");
        }
        msls_throwError("InvalidOperationError", message, properties);
    };

    msls_throwArgumentError =
    function throwArgumentError(message, argument, argumentName, properties) {
        if (!message) {
            message = msls_getResourceString("errors_argument");
        }
        msls_throwError("ArgumentError", message, $.extend(properties, {
            argumentName: argumentName,
            argumentValue: argument
        }));
    };

    msls_throwIfFalsy =
    function throwIfFalsy(argument, argumentName) {
        if (!argument) {
            var message;
            if (argumentName) {
                message = msls_getResourceString("errors_falsy_1args", argumentName);
            } else {
                message = msls_getResourceString("errors_falsy");
            }
            msls_throwArgumentError(message, argument, argumentName);
        }
    };

}());

(function () {
    var _rawLoadPromise;

    function createLoadPromise(ajaxFunction) {
        return new WinJS.Promise(
            function initLoad(complete, error) {
                ajaxFunction({
                    url: msls_rootUri + "/Content/Resources/Generated/model.json",
                    cache: true,
                    dataType: "text",
                    error: function (request, reason, e) {
                        error({
                            reason: reason,
                            e: e
                        });
                    },
                    success: complete
                });
            }
        );
    }

    msls_mark(msls_codeMarkers.loadModelStart);
    _rawLoadPromise = createLoadPromise($.ajax);

    msls_defineClass(msls, "ModelService", function ModelService() {
        this.isLoaded = false;
        msls_setProperty(this, "_itemDictionary", {});
    }, null, {
        load: function load() {
            var me = this;

            if (!me._loadPromise) {
                msls_setProperty(this, "_loadPromise", new WinJS.Promise(
                    function initLoad(complete, error) {
                        var fileLoader = !me._ajaxFunction ? _rawLoadPromise : createLoadPromise(me._ajaxFunction);
                        function reportModelLoadError(failure) {
                            msls_mark(msls_codeMarkers.loadModelEnd);
                            error(msls_getResourceString(
                                "model_failed_server_1args", failure.reason + " - " + (failure.e || "")));
                        }

                        function parseAndProcessModel(result) {
                            msls_mark(msls_codeMarkers.loadModelEnd);
                            msls_mark(msls_codeMarkers.parseModelStart);
                            try {
                                result = $.parseJSON(result);
                                if (!(result instanceof Object)) {
                                    throw msls_getResourceString(
                                        "model_invalid_json");
                                }
                                me.model = result;

                            } catch (e) {
                                error(msls_getResourceString(
                                    "model_failed_parse_1args", (e || "")));
                                return;
                            }
                            msls_mark(msls_codeMarkers.parseModelEnd);
                            msls_mark(msls_codeMarkers.processModelStart);
                            try {
                                me._registerModelItem(me.model, true);
                                me._resolveReferenceProperties(me.model, true);
                            } catch (e) {
                                error(e);
                                return;
                            }
                            msls_mark(msls_codeMarkers.processModelEnd);
                            me.isLoaded = true;
                            complete(me.model);
                        }

                        fileLoader.then(parseAndProcessModel, reportModelLoadError);
                    }
                ));
            }
            return me._loadPromise;
        },
        tryLookupById: function tryLookupById(modelId) {
            var item;
            if (modelId) {
                item = this._itemDictionary[modelId];
                if (item) {
                    return item;
                }
            }
            return null;
        },
        _registerModelItem: function _registerModelItem(item, recursive) {
            var propertyName;
            if (item && item.id) {
                this._itemDictionary[item.id] = item;
            }
            if (recursive) {
                if (item && (item instanceof Object)) {
                    for (propertyName in item) {
                        this._registerModelItem(item[propertyName], recursive);
                    }
                }
            }
        },
        _resolveReferenceProperties: function _resolveReferenceProperties(item, recursive) {
            var propertyName,
                value,
                referenceId;

            if (item && (item instanceof Object)) {
                for (propertyName in item) {
                    value = item[propertyName];
                    if ((value instanceof Object) && "__id" in value) {
                        referenceId = value.__id;
                        if ((item[propertyName] = this.tryLookupById(referenceId)) === null) {
                            throwModelError(msls_getResourceString("model_reference_error_1args", referenceId));
                        }
                    } else if (recursive) {
                        this._resolveReferenceProperties(value, recursive);
                    }
                }
            }
        }

    });

    function throwModelError(message) {
        msls_throwError("ModelError", message);
    }

    msls_addToInternalNamespace("services", {
        modelService: new msls.ModelService()
    });

}());

var msls_builtIn_extensionName = "Microsoft.LightSwitch.Extensions",
    msls_getAttribute,
    msls_getAttributes,
    msls_getLocalizedString,
    msls_getApplicationDefinition,
    msls_getControlForPropertyDefinition,
    msls_getControlPropertyId,
    msls_getUnderlyingTypes,
    msls_ensureNonNullableType,
    msls_getProgrammaticName,
    msls_getCssClassName,
    msls_findModelItem,
    msls_findGlobalItems,
    msls_isCallExpression,
    msls_isChainExpression,
    msls_isConstantExpression,
    msls_isMemberExpression,
    msls_isControlDefinition,
    msls_isPrimitiveType,
    msls_isEntityContainer,
    msls_isNullableType,
    msls_isSemanticType,
    msls_isScreenDefinition,
    msls_isEntityType,
    msls_isKeyProperty,
    msls_isApplicationDefinition,
    msls_isGroupControl;

(function () {

    var localizeRE = /^\$\((.+)\)$/;

    msls_getAttribute =
    function getAttribute(item, classId) {

        var att = null,
            s = null;
        if (item) {
            att = item[classId];
            if (att) {
                if ($.isArray(att)) {
                    if (att.length > 0) {
                        s = att[0];
                    }
                } else {
                    s = att;
                }
            }
        }
        return s;
    };

    msls_getAttributes =
    function getAttributes(item, classId) {

        var att = null,
            m = null;
        if (item) {
            att = item[classId];
            if (att) {
                if ($.isArray(att)) {
                    m = att;
                } else {
                    m = [att];
                }
            }
        }
        return m;
    };

    msls_getLocalizedString =
    function getLocalizedString(value) {

        var result,
            resource;
        if (value) {
            result = localizeRE.exec(value);
            if (result) {
                resource = msls_getString(result[1]);
                if (!resource.empty) {
                    value = resource.value;
                }
            }
        }
        return value;
    };

    msls_getApplicationDefinition =
    function getApplicationDefinition() {
        var applicationDefinition = null,
            modelService = msls.services.modelService,
            model = modelService.model;
        if (modelService.isLoaded && !!model && !!model.modules) {
            applicationDefinition = msls_iterate(model.modules).first(function (module) {
                return msls_isApplicationDefinition(module);
            });
        }
        return applicationDefinition;
    };

    msls_findModelItem = function findModelItem(itemCollection, programmaticName, predicate) {
        var modelItem = null;
        if (!!itemCollection && !!programmaticName) {
            modelItem = msls_iterate(itemCollection).first(
                function (item) {
                    return ((!predicate || predicate(item)) && (item.name === programmaticName || item.name === getPossibleModelName(programmaticName)));
                });
        }
        return modelItem;
    };

    msls_getProgrammaticName = function getProgrammaticName(modelName, forceCamelCase) {
        if (forceCamelCase && modelName.length > 1) {
            modelName = modelName[0].toLowerCase() + modelName.substring(1);
        }
        return modelName;
    };

    msls_getCssClassName = function getCssClassName(identifier) {

        if (!!identifier) {
            identifier = identifier[0].toLowerCase() + identifier.substring(1);
            return identifier.replace(/([A-Z])/g, "-$1").toLowerCase();
        }
        return identifier;
    };

    function getPossibleModelName(programmaticName) {
        return programmaticName;
    }

    msls_findGlobalItems =
    function findGlobalItems(filter) {
        var items = [],
            model = msls.services.modelService.model;
        if (!!model && !!model.modules) {
            $.each(model.modules, function (index, module) {
                if (module.globalItems) {
                    $.each(module.globalItems, function (index2, item) {
                        if (!filter || filter(item)) {
                            items.push(item);
                        }
                    });
                }
            });
        }

        return items;
    };

    msls_getControlForPropertyDefinition =
    function getControlForPropertyDefinition(propertyDefinition) {
        var controlId = propertyDefinition.id.replace(/\/Properties\[.*\]/, ""),
            control = msls.services.modelService.tryLookupById(controlId);
        return control;
    };

    msls_getControlPropertyId =
    function getControlPropertyId(propertyName, controlName) {
        return ":" + (controlName || "RootControl") + "/Properties[" + propertyName + "]";
    };

    msls_getUnderlyingTypes =
    function getUnderlyingTypes(dataTypeDefinition) {

        var primitiveType = dataTypeDefinition,
            semanticType;

        primitiveType = msls_ensureNonNullableType(primitiveType);

        while (!!primitiveType && msls_isSemanticType(primitiveType)) {
            semanticType = primitiveType;
            primitiveType = semanticType.underlyingType;
        }

        return { primitiveType: primitiveType, semanticType: semanticType };
    };

    msls_ensureNonNullableType =
    function ensureNonNullableType(dataType) {

        var nullableType;
        if (msls_isNullableType(dataType)) {
            nullableType = dataType;
            dataType = nullableType.underlyingType;
        }
        return dataType;
    };

    msls_isGroupControl =
    function isGroupControl(controlDefinition) {
        return controlDefinition.supportedContentItemKind === "Group";
    };

    msls_isCallExpression =
    function isCallExpression(item) {
        return "target" in item;
    };

    msls_isChainExpression =
    function isChainExpression(item) {
        return "links" in item;
    };

    msls_isConstantExpression =
    function isConstantExpression(item) {
        return "value" in item;
    };

    msls_isMemberExpression =
    function isMemberExpression(item) {
        return "member" in item;
    };

    msls_isControlDefinition =
    function isControlDefinition(item) {
        return "supportedContentItemKind" in item;
    };

    msls_isPrimitiveType =
    function isPrimitiveType(item) {
        return "__isPrimitiveType" in item;
    };

    msls_isEntityContainer =
    function isEntityContainer(item) {
        return "entitySets" in item;
    };

    msls_isNullableType =
    function isNullableType(item) {
        return "__isNullableType" in item;
    };

    msls_isSemanticType =
    function isSemanticType(item) {
        return "__isSemanticType" in item;
    };

    msls_isScreenDefinition =
    function isScreenDefinition(item) {
        return "rootContentItem" in item;
    };

    msls_isEntityType =
    function isEntityType(item) {
        return "__isEntityType" in item;
    };

    msls_isKeyProperty =
    function isKeyProperty(item) {
        return "__isKeyProperty" in item;
    };

    msls_isApplicationDefinition =
    function isApplicationDefinition(item) {
        return "homeScreen" in item;
    };

}());

var msls_CollectionChangeAction,
    msls_CollectionChange;


(function () {

    msls_defineEnum(msls, {
        CollectionChangeAction: {
            refresh: "refresh",
            add: "add",
            remove: "remove"
        }
    });
    msls_CollectionChangeAction = msls.CollectionChangeAction;

    msls_defineClass(msls, "CollectionChange", function CollectionChange(action, items, oldStartingIndex, newStartingIndex) {
        this.action = action;
        this.items = items;
        this.oldStartingIndex = oldStartingIndex;
        this.newStartingIndex = newStartingIndex;
    });

    msls_CollectionChange = msls.CollectionChange;

    msls_expose("CollectionChangeAction", msls_CollectionChangeAction);
    msls_expose("CollectionChange", msls_CollectionChange);

}());

var msls_defineClassWithDetails,
    msls_ObjectWithDetails,
    msls_ObjectWithDetails_Details,
    msls_ObjectWithDetails_Details_Property,
    msls_propertyWithDetails;

(function () {

    msls_defineClassWithDetails =
    function defineClassWithDetails(parent, className,
        constructor, detailsConstructor, baseClass, simpleMembers, detailsMembers) {
        var cls = msls_defineClass(parent, className, constructor, baseClass),
            baseCls = baseClass,
            baseDetailsCls = baseCls ? baseCls.Details : null,
            detailsCls = msls_defineClass(cls, "Details",
                detailsConstructor, baseDetailsCls),
            _PropertySet = msls_defineClass(detailsCls, "PropertySet",
                function PropertySet(details) {
                    msls_setProperty(this, "_details", details);
                },
                baseCls ? baseCls.Details.PropertySet : null
            );
        msls_mixIntoExistingClass(cls, simpleMembers);
        msls_mixIntoExistingClass(detailsCls, detailsMembers);
        msls_mixIntoExistingClass(detailsCls, {
            properties: msls_accessorProperty(
                function properties_get() {
                    if (!this._properties) {
                        msls_setProperty(this, "_properties",
                            new _PropertySet(this));
                    }
                    return this._properties;
                }
            )
        });
        return cls;
    };

    msls_defineClassWithDetails(msls, "ObjectWithDetails",
        function ObjectWithDetails() {
            this.details = new this.constructor.Details(this);
        },
        function ObjectWithDetails_Details(owner) {
            this.owner = owner;
        },
        null,
        null,
        {
            getModel: function getModel() {
                var model = this._model;
                if (!model) {
                    if (this._findModel) {
                        model = this._findModel();
                    }

                    msls_setProperty(
                        Object.getPrototypeOf(this),
                        "_model", model);
                }
                return model;
            }
        }
    );
    msls_ObjectWithDetails = msls.ObjectWithDetails;
    msls_ObjectWithDetails_Details = msls_ObjectWithDetails.Details;

    msls_makeObservable(msls_ObjectWithDetails);
    msls_makeObservable(msls_ObjectWithDetails_Details);

    msls_mixIntoExistingClass(msls_ObjectWithDetails_Details.PropertySet, {
        all: function all() {
            var result = [], name;
            for (name in this) {
                if (name.charCodeAt(0) === /*_*/95) {
                    continue;
                }
                if (this[name] && !msls_isFunction(this[name])) {
                    result.push(this[name]);
                }
            }
            return result;
        }
    });

    msls_defineClass(msls_ObjectWithDetails_Details, "Property",
        function ObjectWithDetails_Details_Property(details, entry) {
            this.owner = details ? details.owner : null;
            msls_setProperty(this, "_details", details);
            msls_setProperty(this, "_entry", entry);
        },
        null, {
            name: msls_accessorProperty(
                function name_get() {
                    return this._entry.name;
                }
            ),
            isReadOnly: msls_accessorProperty(
                function isReadOnly_get() {
                    return !this._entry.set;
                }
            ),
            getPropertyType: function getPropertyType() {
                return this._entry.type || Object;
            },
            getModel: function getModel() {
                var model = this._entry.model;
                if (!model) {
                    if (this._findModel) {
                        model = this._findModel();
                    }

                    this._entry.model = model;
                }
                return model;
            }
        }
    );
    msls_ObjectWithDetails_Details_Property =
        msls_ObjectWithDetails_Details.Property;

    msls_makeObservable(msls_ObjectWithDetails_Details_Property);

    function capitalizePropertyName(propertyName) {
        return propertyName[0].toUpperCase() + propertyName.substr(1);
    }

    function definePropertyWithDetailsOn(target, propertyName) {
        var entry = this,
            descriptor = entry.simpleDescriptor,
            mixinContent = {},
            isAsyncProperty = !!entry.async,
            getCore, setCore,
            capitalizedPropertyName = capitalizePropertyName(propertyName),
            getValueName = "get" + capitalizedPropertyName,
            setValueName = "set" + capitalizedPropertyName,
            cls = target.constructor,
            detailsCls = cls.Details,
            _PropertySet = detailsCls ? detailsCls.PropertySet : null,
            _Details = entry.detailsClass,
            underlyingPropertyName;

        entry.name = propertyName;

        mixinContent[propertyName] = descriptor;
        msls_makeObservableProperty(descriptor);
        if (isAsyncProperty) {
            descriptor.enumerable = true;

            getCore = descriptor.get;

            descriptor.get = function getValue() {
                var error,
                    result = descriptor.rawGet &&
                        descriptor.rawGet(this.details, descriptor);
                var promise = getCore.call(this);
                if (!promise._state ||
                    promise._state.name === "success" ||
                    promise._state.name === "error") {
                    promise.then(
                        function onComplete(value) {
                            result = value;
                        },
                        function onError(e) {
                            error = e;
                        }
                    );
                }
                if (error) {
                    throw error;
                }
                return result;
            };
        }
        if (descriptor.set) {
            setCore = descriptor.set;

            descriptor.set = function setValue(value) {
                var me = this, promise, initError;
                promise = msls_promiseOperation(
                    function initSetValue(operation) {
                        try {
                            setCore.call(me, value, operation);
                        } catch (e) {
                            initError = e;
                            throw e;
                        }
                        if (setCore.length === 1) {
                            operation.complete();
                        }
                    }
                );
                if (initError) {
                    throw initError;
                }
            };
        }

        if (!isAsyncProperty) {
            mixinContent[getValueName] = {
                enumerable: !msls_isLibrary
            };

            getCore = descriptor.get;

            mixinContent[getValueName].value = function getValue() {
                var promise = WinJS.Promise.as(getCore.call(this));
                return promise;
            };
        } else {
            mixinContent[getValueName] = getCore;
        }
        if (descriptor.set) {
            if (!isAsyncProperty) {
                mixinContent[setValueName] = {
                    enumerable: !msls_isLibrary,
                    value: descriptor.set
                };
            } else {
                mixinContent[setValueName] = descriptor.set;
            }
        }

        msls_mixIntoExistingClass(cls, mixinContent);

        if (_PropertySet && _Details) {
            mixinContent = {};
            underlyingPropertyName = "__" + propertyName;
            mixinContent[propertyName] = msls_accessorProperty(
                function property_get() {
                    if (!this[underlyingPropertyName]) {
                        msls_setProperty(this, underlyingPropertyName,
                            new _Details(this._details, entry));
                    }
                    return this[underlyingPropertyName];
                }
            );
            msls_mixIntoExistingClass(_PropertySet, mixinContent);
        }
    }

    msls_propertyWithDetails =
    function propertyWithDetails(simpleDescriptor, propertyType, detailsClass) {
        var descriptor = Object.create(simpleDescriptor);
        descriptor.simpleDescriptor = simpleDescriptor;
        descriptor.type = propertyType;
        descriptor.detailsClass = detailsClass;
        descriptor.defineOn = definePropertyWithDetailsOn;
        return descriptor;
    };

    msls_expose("ObjectWithDetails", msls_ObjectWithDetails);

}());

var msls_BusinessObject,
    msls_BusinessObject_Details,
    msls_BusinessObject_Details_Property;

(function () {

    msls_defineClassWithDetails(msls, "BusinessObject",
        function BusinessObject() {
            msls_ObjectWithDetails.call(this);
        },
        function BusinessObject_Details(owner) {
            msls_ObjectWithDetails_Details.call(this, owner);
        },
        msls_ObjectWithDetails
    );
    msls_BusinessObject = msls.BusinessObject;
    msls_BusinessObject_Details = msls_BusinessObject.Details;

    msls_defineClass(msls_BusinessObject_Details, "Property",
        function BusinessObject_Details_Property(details, entry) {
            msls_ObjectWithDetails_Details_Property.call(this, details, entry);
        },
        msls_ObjectWithDetails_Details_Property,
        {
            _findModel: function _findModel() {
                return msls_findModelItem(
                    this._details.getModel().properties,
                    this._entry.name);
            }
        }
    );
    msls_BusinessObject_Details_Property =
        msls_BusinessObject_Details.Property;

    msls_expose("BusinessObject", msls_BusinessObject);

}());

var msls_ValidationResult;

(function () {

    msls_defineClass(msls, "ValidationResult", function ValidationResult(property, message) {
        this.property = property;
        this.message = message;
    });
    msls_ValidationResult = msls.ValidationResult;

    msls_expose("ValidationResult", msls_ValidationResult);

}());

var OData = window.OData,
    datajs = window.datajs;

var msls_initEntity,
    msls_initEntityDetails,
    msls_initLink,
    msls_initLinkSet,
    msls_initEntitySet,
    msls_initDataServiceQuery,
    msls_initDataService,
    msls_initDataServiceDetails,
    msls_initDataWorkspace,
    msls_initDataWorkspaceDetails,
    msls_DataWorkspace_beginNestedChanges,
    msls_DataWorkspace_updateNestedChangeCount,
    msls_EntitySet_getEntitySetForEntityType,
    msls_EntitySet_isEntitySetReadOnly,
    msls_DataServiceQuery_isValidSkipTop,
    msls_toODataString,
    msls_MergeOption;

(function () {

    msls_defineClassWithDetails(msls, "Entity",
        function Entity(entitySet) {
            msls_BusinessObject.call(this);
            msls_initEntity(this, entitySet);
        },
        function Entity_Details(owner) {
            msls_BusinessObject_Details.call(this, owner);
            msls_initEntityDetails(this, owner);
        },
        msls_BusinessObject
    );

    msls_defineClass(msls, "Link",
        function Link(end1, endEntity1, end2, endEntity2, state, changeSetIndex) {
            msls_initLink(this, end1, endEntity1, end2, endEntity2, state, changeSetIndex);
        }
    );

    msls_defineEnum(msls, {
        LinkState: {
            unchanged: 0,
            added: 1,
            deleted: 3,
            discarded: 4
        }
    });

    msls_defineClass(msls, "LinkSet",
        function LinkSet(endNames, propertyNames) {
            msls_initLinkSet(this, endNames, propertyNames);
        }
    );

    msls_defineEnum(msls, {
        MergeOption: {
            appendOnly: "appendOnly",
            unchangedOnly: "unchangedOnly",
        }
    });
    msls_MergeOption = msls.MergeOption;

    msls_defineClass(msls, "EntitySet",
        function EntitySet(dataService, entry) {
            msls_initEntitySet(this, dataService, entry);
        }
    );

    msls_defineClass(msls, "DataServiceQuery",
        function DataServiceQuery(source, rootUri, queryParameters) {
            msls_initDataServiceQuery(this, source, rootUri, queryParameters);
        }
    );

    msls_defineClassWithDetails(msls, "DataService",
        function DataService(dataWorkspace) {
            msls_ObjectWithDetails.call(this);
            msls_initDataService(this, dataWorkspace);
        },
        function DataService_Details(owner) {
            msls_ObjectWithDetails_Details.call(this, owner);
            msls_initDataServiceDetails(this, owner);
        },
        msls_ObjectWithDetails
    );

    msls_defineClassWithDetails(msls, "DataWorkspace",
        function DataWorkspace() {
            msls_ObjectWithDetails.call(this);
            msls_initDataWorkspace(this);
        },
        function DataWorkspace_Details(owner) {
            msls_ObjectWithDetails_Details.call(this, owner);
            msls_initDataWorkspaceDetails(this, owner);
        },
        msls_ObjectWithDetails
    );

}());

var msls_Entity_applyNestedChanges,
    msls_Entity_cancelNestedChanges,
    msls_Entity_raiseNavigationPropertyChanged,
    msls_Entity_getNavigationPropertyTargetEntitySet,
    msls_Entity_getNavigationPropertyTargetMultiplicity,
    msls_Entity_tryGetAddedReferencePropertyValue,
    msls_Entity_resetAddedNavigationPropertyAfterSave,
    msls_Entity_resetModifiedReferencePropertyAfterSave,
    msls_Entity_getEntityCollection,
    msls_Entity_getAddedEntitiesInCollection,
    msls_replaceEntityData,
    msls_loadEntity,
    msls_loadExpandedEntities;

(function () {

    var msls_Sequence_Array = msls_Sequence.Array,
        navigationPropertyState = {
            notInitialized: -1,
            unavailable: 0,
            available: 1,
            loaded: 2
        },
        multiplicity = {
            many: "Many",
            zeroOrOne: "ZeroOrOne",
            one: "One"
        },
        _DataServiceQuery = msls.DataServiceQuery,
        _Entity = msls.Entity,
        _EntityDetails = _Entity.Details,
        _EntityProperty,
        _TrackedProperty,
        _StorageProperty,
        _ReferenceProperty,
        _CollectionProperty,
        _EntityCollection,
        _ComputedProperty,
        _EntityState,
        static_loadedEntityData;

    msls_defineEnum(msls, {
        EntityState: {
            unchanged: "unchanged",
            added: "added",
            modified: "modified",
            deleted: "deleted",
            discarded: "discarded"
        }
    });
    _EntityState = msls.EntityState;

    function getEntityPropertyValue() {
        return this._entry.get.call(this._details.owner);
    }

    function setEntityPropertyValue(value) {
        if (!this._entry.set) {
            msls_throwInvalidOperationError(msls_getResourceString("errors_setReadOnlyProperty", this._entry.name));
        }
        this._entry.set.call(this._details.owner, value);
    }

    msls_defineClass(_EntityDetails, "Property",
        function Entity_Details_Property(details, entry) {
            msls_BusinessObject_Details_Property.call(this, details, entry);
            this.entity = this.owner;
        },
        msls_BusinessObject_Details_Property, {
            value: msls_observableProperty(null,
                getEntityPropertyValue,
                setEntityPropertyValue
            )
        }
    );
    _EntityProperty = _EntityDetails.Property;

    function getIsEditedName(serviceName) {
        return "__" + serviceName + "_IsEdited";
    }

    function isNavigationProperty(
        entry) {
        return isReferenceNavigationProperty(entry) ||
            isCollectionNavigationProperty(entry);
    }

    function isReferenceNavigationProperty(
        entry) {
        return entry.kind === "reference" || entry.kind === "virtualReference";
    }

    function isCollectionNavigationProperty(
        entry) {
        return entry.kind === "collection" || entry.kind === "virtualCollection";
    }

    function isVirtualNavigationProperty(
        entry) {
        return entry.kind === "virtualReference" || entry.kind === "virtualCollection";
    }

    function getNavigationPropertyDataPropertyName(propertyName) {
        return "__" + propertyName;
    }

    function tryGetNavigationPropertyData(details, property) {
        return details[getNavigationPropertyDataPropertyName(property.name)];
    }

    function getIsEdited() {
        var details = this._details,
            entry = this._entry,
            data = details._, navigationPropertyData;
        if (entry.kind === "storage") {
            return !!data[getIsEditedName(entry.serviceName)];
        } else if (isReferenceNavigationProperty(
            entry)) {
            navigationPropertyData = tryGetNavigationPropertyData(
                details, this);
            return !!navigationPropertyData && !!navigationPropertyData.changeInfo;
        }
        return false;
    }

    function getIsChanged() {
        if (this._details.entityState === _EntityState.added) {
            return false;
        }
        return this.isEdited;
    }

    function isNavigationPropertyFromAssociationEnd(
        association,
        associationEnd,
        navigationPropertyDefinition) {
        return navigationPropertyDefinition.association === association &&
            navigationPropertyDefinition.fromEnd === associationEnd;
    }

    function getNavigationPropertyTargetEntitySet(details, navigationPropertyData) {

        var associationSetEnd = msls_iterate(navigationPropertyData.associationSet.ends).first(function () {
                    return this.name === navigationPropertyData.model.toEnd.name;
                }),
            dataService = details.entitySet.dataService,
            entityContainer = associationSetEnd.entityContainer;

        if (entityContainer) {
            dataService = dataService.details.dataWorkspace[msls_getProgrammaticName(entityContainer.name)];
        }

        return dataService[msls_getProgrammaticName(associationSetEnd.entitySet.name)];
    }

    function getNavigationPropertyValueWithoutLoading(
        details,
        entry,
        data) {
        var model = data.model;

        if (isReferenceNavigationProperty(entry)) {
            if (data.state === navigationPropertyState.available) {
                data.value = data.linkSet.getTargetEntity(
                    model.fromEnd.name, details.entity, model.toEnd.name);
                data.state = navigationPropertyState.loaded;
            }
        } else {
            if (!data.value) {
                data.value = new _EntityCollection(details, data);
            }
        }
        return data.value;
    }

    function tryRaiseCollectionChangeEvent(data,
        action, items, oldStartingIndex, newStartingIndex) {
        var entityCollection = data.value;
        if (entityCollection) {
            entityCollection.dispatchEvent("collectionchange",
                new msls_CollectionChange(
                    action, items, oldStartingIndex, newStartingIndex));
        }
    }

    function setNavigationPropertyIsLoaded(
        details,
        entry,
        data,
        property
        ) {
        if (!property) {
            property = details.properties[entry.name];
        }

        var entity = details.entity,
            value;

        data.state = navigationPropertyState.available;

        value = getNavigationPropertyValueWithoutLoading(
            details, entry, data);

        property.dispatchChange("isLoaded");
        if (isReferenceNavigationProperty(entry)) {
            property.dispatchChange("value");
            entity.dispatchChange(entry.name);
        } else {
            tryRaiseCollectionChangeEvent(data, msls_CollectionChangeAction.refresh);
        }
    }

    function getNavigationStoragePropertyName(
        propertyModel,
        isVirtual) {
        var keyPropertyName = propertyModel;
        if (isVirtual) {
            keyPropertyName = propertyModel.entityProperty.name;
        }
        return keyPropertyName;
    }

    function loadLink(
        sourceEntity,
        sourcePropertyEntry,
        sourcePropertyData,
        targetEntity,
        sourceEntityIsLinkOwner,
        mergeOption,
        isVirtual) {

        var attachLink = false,
            linkSet = sourcePropertyData.linkSet,
            sourcePropertyModel = sourcePropertyData.model,
            targetPropertyName = sourcePropertyData.toPropertyName,
            targetEntityDetails,
            targetPropertyData,
            owner,
            ownerPropertyData,
            ownerAssociationEnd,
            dependent,
            dependentPropertyData,
            dependentAssociationEnd,
            ownerPropertyIsLoaded,
            ownerPropertyCurrentValue,
            ownerStorageProperties,
            dependentStorageProperties,
            i, len,
            ownerData,
            dependentData,
            ownerStoragePropertyValue,
            dependentStoragePropertyValue,
            propertyName,
            propertyObject,
            dataServiceDetails = sourceEntity.details.entitySet.dataService.details;

        function ensureOwnerPropertyStatus() {
            if (ownerPropertyData) {
                var ownerPropertyState = ownerPropertyData.state;
                ownerPropertyIsLoaded =
                    ownerPropertyState !== navigationPropertyState.notInitialized &&
                    ownerPropertyState !== navigationPropertyState.unavailable;
                ownerPropertyCurrentValue = ownerPropertyData.value;

            } else {
                ownerPropertyCurrentValue = linkSet.getAnyReferenceEntity(
                    ownerAssociationEnd.name, owner, dependentAssociationEnd.name);
                ownerPropertyIsLoaded = !!ownerPropertyCurrentValue;
            }
        }

        function _getStoragePropertyValue(storagePropertyModel, entityData) {
            var storagePropertyValue,
                storagePropertyName;
            if (entityData) {
                storagePropertyName = getNavigationStoragePropertyName(
                    storagePropertyModel, isVirtual);
                storagePropertyValue = entityData[storagePropertyName];
            }
            if (storagePropertyValue === undefined) {
                storagePropertyValue = null;
            }
            return storagePropertyValue;
        }

        if (targetEntity) {
            targetEntityDetails = targetEntity.details;
            if (targetPropertyName) {
                targetPropertyData = getNavigationPropertyData(
                    targetEntityDetails,
                    targetEntityDetails.properties[targetPropertyName]._entry);
            }
        }

        if (sourceEntityIsLinkOwner) {
            owner = sourceEntity;
            ownerPropertyData = sourcePropertyData;
            ownerAssociationEnd = sourcePropertyModel.fromEnd;
            dependent = targetEntity;
            dependentPropertyData = targetPropertyData;
            dependentAssociationEnd = sourcePropertyModel.toEnd;
        } else {
            owner = targetEntity;
            ownerPropertyData = targetPropertyData;
            ownerAssociationEnd = sourcePropertyModel.toEnd;
            dependent = sourceEntity;
            dependentPropertyData = sourcePropertyData;
            dependentAssociationEnd = sourcePropertyModel.fromEnd;
        }


        if (mergeOption === msls_MergeOption.appendOnly) {
            ensureOwnerPropertyStatus();
            if (!ownerPropertyIsLoaded) {
                attachLink = true;

                sourcePropertyData.associationSet.ends.forEach(
                    function (associationSetEnd) {
                        if (associationSetEnd.name === ownerAssociationEnd.name) {
                            ownerStorageProperties = associationSetEnd.properties;
                        } else if (associationSetEnd.name ===
                            dependentAssociationEnd.name) {
                            dependentStorageProperties = associationSetEnd.properties;
                        }
                    });
                if (Array.isArray(ownerStorageProperties) &&
                    Array.isArray(dependentStorageProperties) &&
                    ownerStorageProperties.length === dependentStorageProperties.length) {

                    ownerData = owner.details._;
                    dependentData = dependent && dependent.details._;
                    if (dependentData) {
                        for (i = 0, len = ownerStorageProperties.length; i < len; i++) {
                            ownerStoragePropertyValue = _getStoragePropertyValue(
                                ownerStorageProperties[i], ownerData);
                            dependentStoragePropertyValue = _getStoragePropertyValue(
                                dependentStorageProperties[i], dependentData);

                            if (!msls_isSameValue(
                                ownerStoragePropertyValue, dependentStoragePropertyValue)) {
                                attachLink = false;
                                break;
                            }
                        }
                    }
                }
            }
        } else {
            if (owner.details.entityState === _EntityState.unchanged) {
                ensureOwnerPropertyStatus();
                if (!ownerPropertyIsLoaded) {
                    attachLink = true;
                } else if (ownerPropertyCurrentValue !== dependent) {
                    if (!!ownerPropertyCurrentValue) {
                        linkSet.deleteReferenceLink(
                            ownerAssociationEnd.name, owner,
                            dependentAssociationEnd.name,
                            ownerPropertyCurrentValue);
                    }
                    attachLink = true;
                }
            }
        }

        if (attachLink) {
            if (dependent) {
                linkSet.attachLink(
                    ownerAssociationEnd.name, owner,
                    dependentAssociationEnd.name, dependent);
            }
            if (ownerPropertyData) {
                ownerPropertyData.state = navigationPropertyState.loaded;
                ownerPropertyData.value = dependent;

                propertyName = ownerPropertyData.model.name;
                propertyObject = owner.details.properties[propertyName];

                propertyObject.dispatchChange("isLoaded");
                propertyObject.dispatchChange("value");
                owner.dispatchChange(propertyName);
                dataServiceDetails.dispatchEvent("contentchange", propertyObject);
            }
            if (dependentPropertyData) {
                propertyName = dependentPropertyData.model.name;
                propertyObject = dependent.details.properties[propertyName];

                if (isCollectionNavigationProperty(
                    propertyObject._entry)) {
                    if (dependentPropertyData.state ===
                        navigationPropertyState.loaded) {
                        dependentPropertyData.state = navigationPropertyState.available;
                        tryRaiseCollectionChangeEvent(dependentPropertyData,
                            msls_CollectionChangeAction.add, [owner]);
                    }
                } else {
                    dependentPropertyData.state = navigationPropertyState.loaded;
                    dependentPropertyData.value = owner;

                    propertyObject.dispatchChange("isLoaded");
                    propertyObject.dispatchChange("value");
                    dependent.dispatchChange(propertyName);
                    dataServiceDetails.dispatchEvent("contentchange", propertyObject);
                }
            }
        }

        return attachLink ||
            ownerPropertyCurrentValue === dependent;
    }

    function mergeNavigationProperty(
        sourceEntity,
        sourcePropertyEntry,
        sourcePropertyData,
        targetEntities,
        mergeOption,
        isVirtual) {

        var sourceMultiplicity = sourcePropertyData.model.fromEnd.multiplicity,
            sourcePropertyIsReferenceProperty = isReferenceNavigationProperty(
                sourcePropertyEntry),
            sourceEntityIsLinkOwner,
            referenceTargetEntity,
            mergedTargetEntities = [];


        if (sourcePropertyIsReferenceProperty) {
            sourceEntityIsLinkOwner = sourceMultiplicity === multiplicity.many ||
                sourceMultiplicity === multiplicity.one;
        } else {
            sourceEntityIsLinkOwner = false;
        }

        if (sourcePropertyIsReferenceProperty) {
            referenceTargetEntity = targetEntities[0];
            if (!!referenceTargetEntity || sourceEntityIsLinkOwner) {
                loadLink(sourceEntity, sourcePropertyEntry, sourcePropertyData,
                    referenceTargetEntity, sourceEntityIsLinkOwner,
                    mergeOption, isVirtual);
            }

        } else {
            targetEntities.forEach(function (targetEntity) {
                var linkAttached = loadLink(
                    sourceEntity, sourcePropertyEntry, sourcePropertyData,
                    targetEntity, sourceEntityIsLinkOwner, mergeOption, isVirtual);
                if (linkAttached) {
                    mergedTargetEntities.push(targetEntity);
                }
            });
        }

        return mergedTargetEntities;
    }

    function afterNavigationQueryExecuted(
        details,
        entry,
        data,
        isVirtual,
        query,
        hasKeysFilter,
        queryResult) {

        var model = data.model,
            entity = details.entity,
            current = query,
            setIsLoaded = true,
            filtersCount = 0,
            mergedResults = mergeNavigationProperty(
                entity, entry, data,
                queryResult.results, query._mergeOption, isVirtual);

        queryResult.results = mergedResults;

        if (isCollectionNavigationProperty(entry)) {
            do {
                if (msls_DataServiceQuery_isValidSkipTop(current._skip) ||
                    msls_DataServiceQuery_isValidSkipTop(current._take)) {
                    setIsLoaded = false;
                    break;
                } else if (typeof current._filter === "string") {
                    filtersCount += 1;
                }
                current = current._source;
            } while (current);

            if (setIsLoaded) {
                if (hasKeysFilter) {
                    filtersCount -= 1;
                }
                setIsLoaded = filtersCount <= 0;
            }

            if (setIsLoaded) {
                setNavigationPropertyIsLoaded(details, entry, data);
            }
        }
    }

    function getNavigationStoragePropertyType(
        fromPropertyModel,
        isVirtual,
        fromEntityDetails,
        fromPropertyName,
        toPropertyName,
        targetEntitySet) {

        if (isVirtual) {
            return fromPropertyModel.entityProperty.propertyType;

        } else {

            var fromEntityProperty = fromEntityDetails.properties[fromPropertyName],
                entitySetDefinition,
                entityTypeDefinition,
                entityTypeProperties,
                i, len,
                propertyDefinition;

            if (fromEntityProperty) {
                propertyDefinition = fromEntityProperty.getModel();
                return propertyDefinition.propertyType;

            } else {
                entitySetDefinition = targetEntitySet.getModel();
                entityTypeProperties = entitySetDefinition
                    .entityType.properties;
                for (i = 0, len = entityTypeProperties.length; i < len; i++) {
                    propertyDefinition = entityTypeProperties[i];
                    if (propertyDefinition.name === toPropertyName) {
                        return propertyDefinition.propertyType;
                    }
                }
                return null;
            }
        }
    }

    function refreshNavigationPropertyQuery(
        details, entityData, entry,
        navigationPropertyData, isVirtual) {

        var fromKeyProperties,
            toKeyProperties,
            toKeyPropertyName,
            fromKeyProperty,
            fromKeyPropertyName,
            fromKeyPropertyType,
            keyValue,
            primitiveType,
            filters = [],
            targetEntitySet = getNavigationPropertyTargetEntitySet(
                details, navigationPropertyData),
            keyBasedQuery;

        if (navigationPropertyData.query) {
            navigationPropertyData.query = null;
        }

        msls_iterate(navigationPropertyData.associationSet.ends).each(function () {
            if (this.name === navigationPropertyData.model.fromEnd.name) {
                fromKeyProperties = this.properties;
            } else {
                toKeyProperties = this.properties;
            }
        });

        if (Array.isArray(toKeyProperties) &&
            Array.isArray(fromKeyProperties) &&
            toKeyProperties.length === fromKeyProperties.length) {

            toKeyProperties.forEach(function (toKeyProperty, index) {
                toKeyPropertyName = getNavigationStoragePropertyName(
                    toKeyProperty, isVirtual);
                fromKeyProperty = fromKeyProperties[index];
                fromKeyPropertyName = getNavigationStoragePropertyName(
                    fromKeyProperty, isVirtual);
                fromKeyPropertyType = getNavigationStoragePropertyType(
                    fromKeyProperty, isVirtual,
                    details, fromKeyPropertyName,
                    toKeyPropertyName, targetEntitySet);

                if (fromKeyPropertyType) {
                    keyValue = entityData[fromKeyPropertyName];

                    primitiveType = msls_getUnderlyingTypes(fromKeyPropertyType).primitiveType;

                    filters.push(toKeyPropertyName + " eq " + msls_toODataString(keyValue, primitiveType.id));
                }
            });
        }

        if (filters.length > 0 && filters.length === toKeyProperties.length) {
            keyBasedQuery = targetEntitySet.filter(filters.join(" and "));
        }

        if (keyBasedQuery) {
            navigationPropertyData.query = keyBasedQuery;

        } else {
            if (!isVirtual) {
                var result = entityData[entry.serviceName],
                    deferred = result && result.__deferred,
                    queryUri = deferred ? deferred.uri : (entityData.__metadata.uri + "/" + entry.serviceName);

                navigationPropertyData.query = new _DataServiceQuery(
                    {
                        _entitySet: getNavigationPropertyTargetEntitySet(details, navigationPropertyData)
                    },
                    queryUri);
            }
        }

        msls_setProperty(navigationPropertyData.query, "_afterQueryExecuted", function (
            query, queryResult) {
            afterNavigationQueryExecuted(
                details, entry, navigationPropertyData, isVirtual,
                query, !!keyBasedQuery, queryResult);
        });
    }

    function getNavigationPropertyData(details, entry) {
        var entryName = entry.name,
            dataPropertyName = getNavigationPropertyDataPropertyName(entryName),
            data = details[dataPropertyName],
            isVirtual = isVirtualNavigationProperty(entry),
            entryData,
            dataService, dataServiceDetails,
            propertyDefinition,
            association, endNames, propertyNames, endName, otherPropertyDefinition,
            entityContainer,
            associationSet, associationSetName, associationSetEnd,
            linkSets;

        if (!data) {
            dataService = details.entitySet.dataService;
            dataServiceDetails = dataService.details,
            entryData = entry.data;

            if (!entryData) {
                entryData = entry.data = {};

                entryData.model = propertyDefinition = details.properties[entryName].getModel();

                association = isVirtual ? propertyDefinition.virtualAssociation : propertyDefinition.association;
                msls_iterate(association.ends).each(function (end) {
                    if (!isNavigationPropertyFromAssociationEnd(association, end, propertyDefinition)) {
                        otherPropertyDefinition = msls_iterate(end.entityType.properties)
                            .first(function (p) {
                                return isNavigationPropertyFromAssociationEnd(association, end, p);
                            });
                    }
                });
                entryData.toPropertyName = otherPropertyDefinition &&
                    msls_getProgrammaticName(otherPropertyDefinition.name);

                if (isVirtual) {
                    associationSet = msls_iterate(msls_getApplicationDefinition().globalItems)
                        .first(function () {
                            return this.virtualAssociation === association;
                        });
                } else {
                    entityContainer = dataServiceDetails.getModel();
                    associationSet = msls_iterate(entityContainer.associationSets).first(function () {
                            return this.association === association;
                        });
                }
                entryData.associationSet = associationSet;
            }

            data = details[dataPropertyName] = Object.create(entryData);

            data.state = navigationPropertyState.notInitialized;

            linkSets = isVirtual ? dataService.details.dataWorkspace.details._linkSets : dataServiceDetails._linkSets;
            associationSetName = entryData.associationSet.name;
            if (!linkSets[associationSetName]) {
                endNames = [];
                propertyNames = {};
                propertyDefinition = entryData.model;
                association = propertyDefinition.association;
                msls_iterate(association.ends).each(function (end) {
                    endName = end.name;
                    endNames.push(endName);
                    if (isNavigationPropertyFromAssociationEnd(association, end, propertyDefinition)) {
                        propertyNames[endName] = entry.name;
                    } else {
                        propertyNames[endName] = entryData.toPropertyName;
                    }
                });
                linkSets[associationSetName] = new msls.LinkSet(endNames, propertyNames);
            }
            data.linkSet = linkSets[associationSetName];

            if (details.entityState !== _EntityState.added && details.entityState !== _EntityState.discarded) {
                refreshNavigationPropertyQuery(details, details._, entry, data, isVirtual);
            }
        }

        return data;
    }

    function getOriginalValue() {
        var originalValue,
            details = this._details,
            entry = this._entry,
            data = details._, navigationPropertyData;
        if (this.isChanged) {
            if (entry.kind === "storage") {
                originalValue = data.__original[entry.serviceName];
            } else if (isReferenceNavigationProperty(
                entry)) {
                navigationPropertyData = getNavigationPropertyData(
                    details, entry);
                originalValue = navigationPropertyData.changeInfo.originalEntity;
            }
        }
        return originalValue;
    }

    msls_defineClass(_EntityDetails, "TrackedProperty",
        function Entity_Details_TrackedProperty(details, entry) {
            _EntityProperty.call(this, details, entry);
        },
        _EntityProperty, {
            isEdited: msls_observableProperty(null, getIsEdited),
            isChanged: msls_observableProperty(null, getIsChanged),
            originalValue: msls_observableProperty(null, getOriginalValue)
        }
    );
    _TrackedProperty = _EntityDetails.TrackedProperty;

    msls_defineClass(_EntityDetails, "StorageProperty",
        function Entity_Details_StorageProperty(details, entry) {
            _TrackedProperty.call(this, details, entry);
        },
        _TrackedProperty, {
            isReadOnly: msls_observableProperty(null,
                function isReadOnly_get() {
                    var propDef = this.getModel();

                    if (propDef.isReadOnly) {
                        return true;
                    }

                    if (this._details.entityState === _EntityState.added) {
                        return false;
                    }

                    if (msls_isKeyProperty(propDef)) {
                        return true;
                    }

                    return !this._details.entitySet.canUpdate;
                }
            )
        }
    );
    _StorageProperty = _EntityDetails.StorageProperty;

    function getNavigationPropertyTargetMultiplicity(data) {
        return data.model.toEnd.multiplicity;
    }

    function getIsLoaded(details, data) {
        var model, links;
        if (data.state === navigationPropertyState.notInitialized) {
            model = data.model;

            if (getNavigationPropertyTargetMultiplicity(data) !== multiplicity.many &&
                data.linkSet.hasLinks(model.fromEnd.name, details.entity)) {
                data.state = navigationPropertyState.available;
            } else {
                data.state = navigationPropertyState.unavailable;
            }
        }
        return data.state !== navigationPropertyState.unavailable;
    }

    function isLoaded_get() {
        var details = this._details;
        return getIsLoaded(details,
            getNavigationPropertyData(
                details,
                this._entry));
    }

    function load() {
        var me = this,
            details = me._details,
            entry = me._entry,
            data = getNavigationPropertyData(details, entry),
            isLoaded = getIsLoaded(details, data),
            loadPromise = data.loadPromise,
            operationDone;

        if (!loadPromise) {
            if (data.state !== navigationPropertyState.unavailable) {
                data.state = navigationPropertyState.unavailable;
                me.dispatchChange("isLoaded");
            }
            if (me.loadError) {
                me.loadError = null;
            }

            loadPromise = data.loadPromise =
            msls_promiseOperation(function initLoad(operation) {
                loadPromise = data.loadPromise = operation.promise();

                var entity = details.entity,
                    query = data.query;

                function onQueryLoadDone(error, loadOperation) {
                    operationDone = true;
                    data.loadPromise = null;

                    if (!error) {
                        if (!query) {
                            setNavigationPropertyIsLoaded(
                                details, entry, data, me);
                        }

                        loadOperation.complete(data.value);

                    } else {
                        me.loadError = error;

                        loadOperation.error(error);
                    }
                }

                if (query) {
                    query.execute()._thenEx(function (error, result) {
                        onQueryLoadDone(error, operation);
                    });
                    operation.interleave();
                } else {
                    onQueryLoadDone(null, operation);
                }
            });

            if (operationDone) {
                data.loadPromise = null;
            }
        }

        return loadPromise;
    }

    msls_defineClass(_EntityDetails, "ReferenceProperty",
        function Entity_Details_ReferenceProperty(details, entry) {
            _TrackedProperty.call(this, details, entry);
        },
        _TrackedProperty, {
            isLoaded: msls_observableProperty(false, isLoaded_get),
            loadError: msls_observableProperty(null),

            isReadOnly: msls_observableProperty(null,
            function isReadOnly_get() {
                var details = this._details,
                    entry = this._entry,
                    data = getNavigationPropertyData(details, entry),
                    fromEndName = data.model.fromEnd.name,
                    fromModelProperties,
                    fromProperties;

                if (details.entityState === _EntityState.added) {
                    return false;
                }

                msls_iterate(data.associationSet.ends).each(
                    function () {
                        if (this.name === fromEndName) {
                            fromModelProperties = this.properties;
                            return false;
                        } else {
                            return true;
                        }
                    });
                fromProperties = getStoragePropertiesForAssociationSetEnd(
                    details, fromModelProperties,
                    isVirtualNavigationProperty(entry));

                if (fromProperties.length > 0) {
                    return msls_iterate(fromProperties).any(
                        function (fromProperty) {
                            return fromProperty.isReadOnly;
                        });
                } else {
                    return false;
                }
            }),

            load: load
        }
    );
    _ReferenceProperty = _EntityDetails.ReferenceProperty;

    msls_Entity_getNavigationPropertyTargetEntitySet =
    function getNavigationPropertyTargetEntitySetInternal(property) {
        return getNavigationPropertyTargetEntitySet(
            property.entity.details,
            getNavigationPropertyData(
                property._details, property._entry));
    };

    msls_Entity_getNavigationPropertyTargetMultiplicity =
    function getNavigationPropertyTargetMultiplicityInternal(property) {
        return getNavigationPropertyTargetMultiplicity(
            getNavigationPropertyData(
                property._details,
                property._entry));
    };

    msls_Entity_tryGetAddedReferencePropertyValue =
    function tryGetAddedReferencePropertyValue(details, property) {
        var navigationPropertyData = tryGetNavigationPropertyData(
            details, property);
        return navigationPropertyData && navigationPropertyData.value;
    };

    msls_Entity_resetAddedNavigationPropertyAfterSave =
    function resetAddedNavigationPropertyAfterSave(details, property, changeResponseData) {

        var entry = property._entry,
            navigationPropertyData;
        if (!isNavigationProperty(entry)) {
            return;
        }

        navigationPropertyData = tryGetNavigationPropertyData(details, property);
        if (navigationPropertyData) {
            refreshNavigationPropertyQuery(
                details, changeResponseData, entry,
                navigationPropertyData, isVirtualNavigationProperty(entry));
            navigationPropertyData.changeInfo = null;

            if (isReferenceNavigationProperty(entry) &&
                !navigationPropertyData.value) {
                navigationPropertyData.state =
                    navigationPropertyState.unavailable;
                raiseTrackedPropertyChangedEvents(
                    details,
                    entry,
                    false,
                    property);
            }
        }
    };

    msls_Entity_resetModifiedReferencePropertyAfterSave =
    function resetModifiedReferencePropertyAfterSave(details, property) {

        getNavigationPropertyData(
            details, property._entry).changeInfo = null;
    };

    msls_defineClass(msls, "EntityCollection",
        function EntityCollection(details, data) {
            msls_Sequence.call(this);
            msls_setProperty(this, "_details", details);
            msls_setProperty(this, "_data", data);
        },
        msls_Sequence_Array, {
            _array: [],
            _iterator: function iterator() {
                var data = this._data,
                    model = data.model;
                if (data.state === navigationPropertyState.available) {
                    this._array = data.linkSet.getTargetEntities(model.fromEnd.name, this._details.entity, model.toEnd.name);
                    data.state = navigationPropertyState.loaded;
                }
                return msls_Sequence_Array.prototype._iterator.call(this);
            },

            collectionchange: msls_event()
        }
    );
    _EntityCollection = msls.EntityCollection;

    function getQuery() {
        var data = getNavigationPropertyData(this._details, this._entry);
        return data.query;
    }

    msls_defineClass(_EntityDetails, "CollectionProperty",
        function Entity_Details_CollectionProperty(details, entry) {
            _EntityProperty.call(this, details, entry);
        },
        _EntityProperty, {
            isLoaded: msls_observableProperty(false, isLoaded_get),
            loadError: msls_observableProperty(null),

            query: msls_accessorProperty(getQuery),
            value: msls_accessorProperty(getEntityPropertyValue),
            load: load
        }
    );
    _CollectionProperty = _EntityDetails.CollectionProperty;

    msls_Entity_getEntityCollection =
    function getEntityCollection(collectionProperty) {

        var details = collectionProperty._details,
            entry = collectionProperty._entry;
        return getNavigationPropertyValueWithoutLoading(
            details, entry, getNavigationPropertyData(details, entry));
    };

    msls_Entity_getAddedEntitiesInCollection =
    function getAddedEntitiesInCollection(collectionProperty) {

        var details = collectionProperty._details,
            data = getNavigationPropertyData(
                details,
                collectionProperty._entry),
            model = data.model;
        return data.linkSet.getAddedEntities(
            model.fromEnd.name, details.entity, model.toEnd.name);
    };

    function removeAddedEntity(details, entitySet) {
        var addedEntities = entitySet._addedEntities;
        $.each(addedEntities, function (index, item) {
            if (item === details.entity) {
                addedEntities.splice(index, 1);
                return false;
            }
            return true;
        });
    }

    msls_Entity_raiseNavigationPropertyChanged =
    function raiseNavigationPropertyChanged(entity, propertyName, action, item) {
        if (!entity || !propertyName) {
            return;
        }

        var details = entity.details,
            property = details.properties[propertyName],
            entry = property._entry,
            data = details[getNavigationPropertyDataPropertyName(propertyName)];


        if (!!data && data.state === navigationPropertyState.loaded) {
            data.state = navigationPropertyState.available;
        }

        if (isCollectionNavigationProperty(entry)) {
            if (data) {
                tryRaiseCollectionChangeEvent(data, action, [item]);
            }
        } else {
            property.dispatchChange("value");
            entity.dispatchChange(propertyName);
        }
    };

    function raiseRelatedEntitiesNavigationPropertiesChanged(entity, details, action) {
        var entry,
            data,
            toPropertyName,
            toEntities;

        $.each(details.properties.all(), function (i, p) {
            entry = p._entry;
            if (!isNavigationProperty(entry)) {
                return;
            }

            data = getNavigationPropertyData(details, entry);
            toPropertyName = data.toPropertyName;
            if (!toPropertyName) {
                return;
            }

            if (isCollectionNavigationProperty(entry)) {
                toEntities = p.value.array;
                $.each(toEntities, function (j, toEntity) {
                    msls_Entity_raiseNavigationPropertyChanged(toEntity, toPropertyName, action, entity);
                });
            } else if (getIsLoaded(details, data)) {
                msls_Entity_raiseNavigationPropertyChanged(
                    p.value, toPropertyName, action, entity);
            }
        });
    }

    function popEditingScope(details) {
        var data = details._;
        if (!!data.__parent) {
            details._ = data.__parent;
        }
    }

    function isReferencePropertyChangedInChangeSet(
        navigationData, currentChangeSetIndex) {
        var changeSetIndices =
                navigationData &&
                navigationData.changeInfo &&
                navigationData.changeInfo.changeSetIndices;

        return !!changeSetIndices &&
            changeSetIndices.indexOf(currentChangeSetIndex) > -1;
    }

    function popEditingScopesForDiscard(
        details,
        data,
        dataWorkspaceDetails,
        handleChangedProperty) {

        var scopeHasChanges,
            currentChangeSetIndex,
            trackedProperties = msls_iterate(details.properties.all())
                .where(function (p) {
                    return p instanceof _TrackedProperty;
                })
                .array;

        function processChangedProperty(p) {

            var propertyChanged;
            if (p instanceof _StorageProperty) {
                propertyChanged = data.hasOwnProperty(p._entry.serviceName);
            } else {
                propertyChanged = isReferencePropertyChangedInChangeSet(
                    tryGetNavigationPropertyData(
                        details, p),
                    currentChangeSetIndex);
            }

            if (propertyChanged) {
                scopeHasChanges = true;
                if (handleChangedProperty) {
                    handleChangedProperty(data, p, currentChangeSetIndex);
                }
            }
        }

        while (data.__parent) {
            scopeHasChanges = false;
            currentChangeSetIndex = data.__changeSetIndex;

            popEditingScope(details);

            trackedProperties.forEach(processChangedProperty);

            if (scopeHasChanges) {
                msls_DataWorkspace_updateNestedChangeCount(
                    dataWorkspaceDetails, currentChangeSetIndex, -1);
            }
            data = details._;
        }
    }

    function raiseTrackedPropertyDiscardedEvents(entity, property, entry) {
        entity.dispatchChange(entry.name);
        property.dispatchChange("value");
        property.dispatchChange("originalValue");
        property.dispatchChange("isChanged");
        property.dispatchChange("isEdited");
    }

    function isReferencePropertyFirstChangedInChangeSet(navigationData, currentChangeSetIndex) {
        var changeSetIndices = navigationData.changeInfo.changeSetIndices;
        return changeSetIndices[0] === currentChangeSetIndex;
    }

    function discardChanges() {
        var details = this,
            entity = details.entity,
            entityState = details.entityState,
            hasEdits = details.hasEdits,
            entitySet = details.entitySet,
            dataServiceDetails = entitySet.dataService.details,
            dataWorkspaceDetails = dataServiceDetails.dataWorkspace.details,
            data = details._;

        if (entityState === _EntityState.unchanged || entityState === _EntityState.discarded) {
            return;
        }

        if (entityState === _EntityState.added) {

            removeAddedEntity(details, entitySet);

            if (data.__hasEdits) {
                data.__hasEdits = false;
            }
            data.__entityState = _EntityState.discarded;
            raiseRelatedEntitiesNavigationPropertiesChanged(entity, details, msls_CollectionChangeAction.remove);

            popEditingScopesForDiscard(details, data, dataWorkspaceDetails);

            msls_DataWorkspace_updateNestedChangeCount(
                dataWorkspaceDetails, details._.__changeSetIndex, -1);

            if (data.__parent) {
                data.__parent = null;
            }
            data.__changeSetIndex = -1;
            details._ = data;

        } else if (entityState === _EntityState.deleted) {
            popEditingScope(details);
            raiseRelatedEntitiesNavigationPropertiesChanged(entity, details, msls_CollectionChangeAction.add);
            msls_DataWorkspace_updateNestedChangeCount(dataWorkspaceDetails, data.__changeSetIndex, -1);

        } else if (entityState === _EntityState.modified) {
            popEditingScopesForDiscard(details, data, dataWorkspaceDetails,
                function handleChangedProperty(
                    currentData, property, currentChangeSetIndex) {

                    var entry = property._entry,
                        navigationData,
                        model;

                    if (property instanceof _StorageProperty) {
                        if (currentData.hasOwnProperty(getIsEditedName(
                                entry.serviceName))) {
                            raiseTrackedPropertyDiscardedEvents(
                                entity, property, entry);
                        }
                    } else {
                        navigationData = getNavigationPropertyData(
                            details, entry);

                        if (isReferencePropertyFirstChangedInChangeSet(navigationData, currentChangeSetIndex)) {
                            model = navigationData.model;
                            navigationData.linkSet.discardReferenceChanges(model.fromEnd.name, entity, model.toEnd.name);
                            navigationData.value = navigationData.changeInfo.originalEntity;
                            navigationData.state = navigationPropertyState.loaded;
                            navigationData.changeInfo = null;

                            raiseTrackedPropertyDiscardedEvents(entity, property, entry);
                        }
                    }
                }
            );

        }
        if (details.hasEdits !== hasEdits) {
            details.dispatchChange("hasEdits");
        }
        details.dispatchChange("entityState");
        if (--dataServiceDetails._changeCount === 0) {
            dataServiceDetails.dispatchChange("hasChanges");
        }
        dataServiceDetails.dispatchEvent("contentchange", entity);
    }

    function refresh(navigationPropertyNames) {

        var details = this,
            properties = details.properties.all(),
            i, l = properties.length,
            property,
            propertyEntry,
            query;

        if (details.entityState !== _EntityState.unchanged) {
            return WinJS.Promise.as();
        }


        if (!navigationPropertyNames) {
            navigationPropertyNames = [];
            for (i = 0; i < l; i++) {
                property = properties[i];
                propertyEntry = property._entry;
                if (isReferenceNavigationProperty(propertyEntry) &&
                    !isVirtualNavigationProperty(propertyEntry)) {
                    navigationPropertyNames.push(propertyEntry.serviceName);
                }
            }
        }

        query = new _DataServiceQuery(
            {
                _entitySet: details.entitySet
            },
            details._.__metadata.uri);
        if (navigationPropertyNames.length > 0) {
            query = query.expand(navigationPropertyNames.join(","));
        }

        return query.merge(msls.MergeOption.unchangedOnly).execute();
    }

    function _findModel() {
        var model = null,
            entitySet = this.entitySet,
            dataService,
            dataServiceDetails,
            entitySetProperty,
            entitySetDefinition;

        if (!!entitySet &&
            !!(dataService = entitySet.dataService) &&
            !!(dataServiceDetails = dataService.details)) {

            entitySetProperty = msls_iterate(dataServiceDetails.properties.all()).first(
                    function (p) {
                        return (p.value === entitySet);
                    }
                );

            if (entitySetProperty) {
                entitySetDefinition = entitySetProperty.getModel();

                model = entitySetDefinition.entityType;
            }
        }
        return model;
    }

    msls_mixIntoExistingClass(_EntityDetails, {
        entityState: msls_observableProperty(null,
            function entityState_get() {
                return this._.__entityState || _EntityState.unchanged;
            }
        ),
        hasEdits: msls_observableProperty(null,
            function hasEdits_get() {
                return !!this._.__hasEdits;
            }
        ),

        discardChanges: discardChanges,
        refresh: refresh,
        _findModel: _findModel
    });

    msls_initEntityDetails =
    function initEntityDetails(entityDetails, owner) {
        entityDetails.entity = owner;
        if (!static_loadedEntityData) {
            entityDetails._ = {
                __entityState: _EntityState.added
            };
        } else {
            entityDetails._ = static_loadedEntityData;
        }
    };

    function popEditingScopeForCancel(
        entity,
        details,
        entityState,
        data,
        currentChangeSetIndex) {

        $.each(details.properties.all(), function (index, property) {

            if (!(property instanceof _TrackedProperty)) {
                return;
            }

            var entry = property._entry,
                serviceName = entry.serviceName,
                isEditedName,
                propertyChanged = false,
                propertyFirstChanged = false,
                navigationData,
                model,
                newRelatedEntity;

            if (property instanceof _StorageProperty) {
                propertyChanged = data.hasOwnProperty(serviceName);
                if (propertyChanged) {
                    delete data[serviceName];
                    isEditedName = getIsEditedName(serviceName);
                    propertyFirstChanged = data.hasOwnProperty(isEditedName);
                    if (propertyFirstChanged) {
                        delete data[isEditedName];
                    }
                }
            } else {
                navigationData = tryGetNavigationPropertyData(
                    details, property);
                propertyChanged = isReferencePropertyChangedInChangeSet(navigationData, currentChangeSetIndex);
                if (propertyChanged) {
                    model = navigationData.model;
                    newRelatedEntity = navigationData.linkSet.cancelReferenceChanges(model.fromEnd.name, entity, model.toEnd.name);
                    propertyFirstChanged = isReferencePropertyFirstChangedInChangeSet(navigationData, currentChangeSetIndex);

                    navigationData.value = newRelatedEntity;
                    navigationData.state = navigationPropertyState.loaded;
                    if (propertyFirstChanged) {
                        navigationData.changeInfo = null;
                    } else {
                        navigationData.changeInfo.changeSetIndices.pop();
                    }
                }
            }

            if (propertyChanged) {
                entity.dispatchChange(entry.name);
                property.dispatchChange("value");
                if (propertyFirstChanged) {
                    if (entityState !== _EntityState.added) {
                        property.dispatchChange("originalValue");
                        property.dispatchChange("isChanged");
                    }
                    property.dispatchChange("isEdited");
                }
            }
        });
        popEditingScope(details);
    }

    msls_Entity_cancelNestedChanges =
    function cancelNestedChanges(details) {
        var entity = details.entity,
            entityState = details.entityState,
            hasEdits = details.hasEdits,
            entitySet = details.entitySet,
            dataServiceDetails = entitySet.dataService.details,
            dataWorkspaceDetails = dataServiceDetails.dataWorkspace.details,
            lastChangeSetIndex = dataWorkspaceDetails._nestedChangeSets.length - 1,
            data = details._,
            currentChangeSetIndex = data.__changeSetIndex;

        if (entityState === _EntityState.unchanged || entityState === _EntityState.discarded ||
            (lastChangeSetIndex >= 0 && currentChangeSetIndex !== lastChangeSetIndex)) {
            return;
        }

        if (entityState === _EntityState.added) {
            if (data.__parent) {
                popEditingScopeForCancel(
                    entity, details, entityState, data, currentChangeSetIndex);
            } else {
                removeAddedEntity(details, entitySet);
                if (data.__hasEdits) {
                    data.__hasEdits = false;
                }
                data.__entityState = _EntityState.discarded;
                raiseRelatedEntitiesNavigationPropertiesChanged(
                    entity, details, msls_CollectionChangeAction.remove);
            }
        } else if (entityState === _EntityState.deleted) {
            popEditingScope(details);
            raiseRelatedEntitiesNavigationPropertiesChanged(
                entity, details, msls_CollectionChangeAction.add);
        } else if (entityState === _EntityState.modified) {
            popEditingScopeForCancel(
                entity, details, entityState, data, currentChangeSetIndex);
        }
        msls_DataWorkspace_updateNestedChangeCount(
            dataWorkspaceDetails, lastChangeSetIndex, -1);
        if (details.hasEdits !== hasEdits) {
            details.dispatchChange("hasEdits");
        }
        if (entityState !== details.entityState) {
            details.dispatchChange("entityState");
            if (--dataServiceDetails._changeCount === 0) {
                dataServiceDetails.dispatchChange("hasChanges");
            }
            dataServiceDetails.dispatchEvent("contentchange", details.entity);
        }
    };

    msls_Entity_applyNestedChanges =
    function applyNestedChanges(details) {
        var entityState = details.entityState,
            entitySet = details.entitySet,
            dataServiceDetails = entitySet.dataService.details,
            dataWorkspaceDetails = dataServiceDetails.dataWorkspace.details,
            lastChangeSetIndex = dataWorkspaceDetails._nestedChangeSets.length - 1,
            data = details._,
            currentChangeSetIndex = data.__changeSetIndex,
            parentChangeSetIndex = currentChangeSetIndex - 1,
            parentData = data.__parent,
            navigationData, changeSetIndices, changeSetIndicesLength, model;

        if (entityState === _EntityState.unchanged || entityState === _EntityState.discarded ||
            (lastChangeSetIndex >= 0 && currentChangeSetIndex !== lastChangeSetIndex)) {
            return false;
        }

        if (entityState === _EntityState.modified ||
            entityState === _EntityState.added) {
            $.each(details.properties.all(), function (index, property) {
                if (!(property instanceof _ReferenceProperty)) {
                    return;
                }

                navigationData = tryGetNavigationPropertyData(details, property);
                if (isReferencePropertyChangedInChangeSet(navigationData, currentChangeSetIndex)) {
                    model = navigationData.model;
                    navigationData.linkSet.applyReferenceChanges(model.fromEnd.name, details.entity, model.toEnd.name);
                    changeSetIndices = navigationData.changeInfo.changeSetIndices;
                    changeSetIndices.pop();
                    changeSetIndicesLength = changeSetIndices.length;
                    if (changeSetIndicesLength === 0 ||
                        (changeSetIndicesLength > 0 &&
                         changeSetIndices[changeSetIndicesLength - 1] !== parentChangeSetIndex)) {
                        changeSetIndices.push(parentChangeSetIndex);
                    }
                }
            });
        }

        if ((entityState === _EntityState.added && !parentData) ||
            entityState === _EntityState.deleted ||
            parentData.__changeSetIndex !== parentChangeSetIndex) {
            data.__changeSetIndex--;
            return true;
        } else {
            delete data.__parent;
            delete data.__changeSetIndex;
            $.each(data, function (propertyName, propertyValue) {
                if (data.hasOwnProperty(propertyName)) {
                    parentData[propertyName] = propertyValue;
                }
            });
            details._ = parentData;
            return false;
        }
    };

    function deleteEntity() {
        var details = this.details,
            entitySet = details.entitySet,
            dataServiceDetails = entitySet.dataService.details,
            entityState = details.entityState;

        if (entityState === _EntityState.added || entityState === _EntityState.modified) {
            details.discardChanges();
            entityState = details.entityState;
        }

        if (entityState === _EntityState.unchanged) {
            ensurePending(details, _EntityState.deleted);
            dataServiceDetails.dispatchEvent("contentchange", this);
            raiseRelatedEntitiesNavigationPropertiesChanged(this, details, msls_CollectionChangeAction.remove);
        }
    }

    msls_mixIntoExistingClass(_Entity, {
        deleteEntity: deleteEntity
    });

    msls_initEntity =
    function initEntity(entity, entitySet) {
        var entityClassInstance = entity,
            entityClass = entityClassInstance.constructor,
            details = entity.details,
            dataServiceDetails, dataWorkspace, dataWorkspaceDetails, lastChangeSetIndex;
        if (!entitySet) {
            entitySet = msls_EntitySet_getEntitySetForEntityType(
                msls.application.activeDataWorkspace, entity.constructor);
        }
        details.entitySet = entitySet;
        if (details.entityState === _EntityState.added) {
            dataServiceDetails = entitySet.dataService.details;
            entitySet._addedEntities.push(entity);
            dataWorkspace = dataServiceDetails.dataWorkspace;
            dataWorkspaceDetails = dataWorkspace.details;
            lastChangeSetIndex = dataWorkspaceDetails._nestedChangeSets.length - 1;

            details._.__changeSetIndex = lastChangeSetIndex;
            msls_DataWorkspace_updateNestedChangeCount(dataWorkspaceDetails, lastChangeSetIndex, 1);

            if (++dataServiceDetails._changeCount === 1) {
                dataServiceDetails.dispatchChange("hasChanges");
            }
            dataServiceDetails.dispatchEvent("contentchange", entity);
            if (entityClass.created) {
                entityClass.created.call(null, entity);
            }
        }
    };

    function makeEntityDetails(entityClass) {
        function EntityDetails(owner) {
            _EntityDetails.call(this, owner);
        }
        return EntityDetails;
    }

    function getStoragePropertyValue(
        details) {
        return details._[this.serviceName];
    }

    function ensurePending(details, targetState) {

        var dataServiceDetails = details.entitySet.dataService.details,
            dataWorkspaceDetails = dataServiceDetails.dataWorkspace.details,
            data = details._,
            lastChangeSetIndex = dataWorkspaceDetails._nestedChangeSets.length - 1,
            entityState = details.entityState,
            entityUnchanged = entityState === _EntityState.unchanged,
            entityBeingModifiedOutOfScope =
                targetState === _EntityState.modified &&
                data.__changeSetIndex !== lastChangeSetIndex,
            newData;


        if (entityUnchanged || entityBeingModifiedOutOfScope) {
            newData = Object.create(data);
            newData.__parent = data;
            newData.__changeSetIndex = lastChangeSetIndex;
            details._ = newData;

            msls_DataWorkspace_updateNestedChangeCount(
                dataWorkspaceDetails, lastChangeSetIndex, 1);

            if (entityUnchanged) {
                if (!data.__parent) {
                    newData.__original = data;
                }
                newData.__entityState = targetState;
                newData.__hasEdits = true;

                details.dispatchChange("entityState");
                details.dispatchChange("hasEdits");
                if (++dataServiceDetails._changeCount === 1) {
                    dataServiceDetails.dispatchChange("hasChanges");
                }
            }

            data = details._;
        }
        if (!data.__hasEdits) {
            data.__hasEdits = true;
            details.dispatchChange("hasEdits");
        }
    }

    function raiseTrackedPropertyChangedEvents(details, entry, isFirstEdit, property) {
        var dataServiceDetails = details.entitySet.dataService.details,
            propertyName = entry.name;
        if (!property) {
            property = details.properties[propertyName];
        }

        if (isFirstEdit) {
            property.dispatchChange("isEdited");
            if (details.entityState !== _EntityState.added) {
                property.dispatchChange("isChanged");
                property.dispatchChange("originalValue");
            }
        }
        property.dispatchChange("value");
        details.entity.dispatchChange(propertyName);
        dataServiceDetails.dispatchEvent("contentchange", property);
    }

    function setStoragePropertyValue(details, value) {
        var data = details._,
            isFirstEdit = false,
            property = details.properties[this.name],
            serviceName = this.serviceName,
            entityState = details.entityState;
        if (entityState === _EntityState.deleted ||
            entityState === _EntityState.discarded) {
            return;
        }
        ensurePending(details, _EntityState.modified);
        data = details._;
        isFirstEdit = !property.isEdited;
        data[serviceName] = value;
        if (isFirstEdit) {
            data[getIsEditedName(serviceName)] = true;
        }
        raiseTrackedPropertyChangedEvents(
            details,
            this,
            isFirstEdit,
            property);
    }

    function getNavigationPropertyValue(details) {
        var data = getNavigationPropertyData(details, this),
            model = data.model;
        if (!getIsLoaded(details, data)) {
            return details.properties[this.name].load();
        } else {
            return WinJS.Promise.as(
                getNavigationPropertyValueWithoutLoading(details, this, data));
        }
    }

    function setReferencePropertyBaseValue(
        details, entry,
        value, operation, isVirtual) {

        var entityState = details.entityState,
            data = getNavigationPropertyData(details, entry),
            valueEntityState;

        if (entityState === _EntityState.deleted ||
            entityState === _EntityState.discarded) {
            return;
        }

        if (value) {
            valueEntityState = value.details.entityState;
            if (valueEntityState === _EntityState.deleted || valueEntityState === _EntityState.discarded) {
                msls_throwArgumentError(
                    msls_getResourceString("entity_setReferencePropertyValue_DeletedDiscarded"),
                    value, "value");
            }
        }

        if (getIsLoaded(details, data)) {
            setReferencePropertyValueCore(
                details, entry, entityState, data, value, isVirtual);
            operation.complete();
        } else {
            details.properties[entry.name].load().then(function () {
                setReferencePropertyValueCore(
                    details, entry, entityState, data, value, isVirtual);
                operation.complete();
            });
        }
    }

    function getStoragePropertiesForAssociationSetEnd(
        details,
        associationSetEndProperties,
        isVirtual) {
        if (!Array.isArray(associationSetEndProperties) ||
            associationSetEndProperties.length <= 0) {
            return [];
        }

        var result = [],
            properties = details.properties;
        msls_iterate(associationSetEndProperties).each(
            function (endProp) {
                var propName = isVirtual ?
                        endProp.entityProperty.name :
                        endProp,
                    prop = properties[propName];

                if (prop) {
                    result.push(prop);
                    return true;
                } else {
                    result = [];
                    return false;
                }
            });

        return result;
    }

    function setReferencePropertyValueCore(
        details, entry,
        entityState, data,
        value, isVirtual) {

        var model = data.model,
            fromEndName = model.fromEnd.name,
            changeInfo = data.changeInfo,
            isFirstEdit = !changeInfo,
            originalEntity,
            currentChangeSetIndex,
            changeSetIndices,
            changeSetIndicesLength,
            fromModelProperties,
            toModelProperties,
            fromProperties,
            toProperties;

        ensurePending(details, _EntityState.modified);

        originalEntity = data.linkSet.setReferenceLink(fromEndName, details.entity, model.toEnd.name, value);
        data.value = value;
        data.state = navigationPropertyState.loaded;
        if (!changeInfo) {
            changeInfo = data.changeInfo = {
                originalEntity: originalEntity,
                changeSetIndices: []
            };
        }

        currentChangeSetIndex = details._.__changeSetIndex;

        changeSetIndices = changeInfo.changeSetIndices;
        if (!changeSetIndices) {
            changeSetIndices = changeInfo.changeSetIndices = [];
        }

        changeSetIndicesLength = changeSetIndices.length;
        if (changeSetIndicesLength === 0 ||
            changeSetIndices[changeSetIndicesLength - 1] !== currentChangeSetIndex) {
            changeSetIndices.push(currentChangeSetIndex);
        }

        raiseTrackedPropertyChangedEvents(
            details, entry, isFirstEdit);

        msls_iterate(data.associationSet.ends).each(
            function () {
                if (this.name === fromEndName) {
                    fromModelProperties = this.properties;
                } else {
                    toModelProperties = this.properties;
                }
            });
        fromProperties = getStoragePropertiesForAssociationSetEnd(
            details, fromModelProperties, isVirtual);
        if (fromProperties.length > 0) {
            if (value) {
                toProperties = getStoragePropertiesForAssociationSetEnd(
                    value.details, toModelProperties, isVirtual);
            }
            if (!toProperties ||
                toProperties.length === fromProperties.length) {
                fromProperties.forEach(function (fromProperty, index) {
                    fromProperty.value = toProperties ?
                        toProperties[index].value : null;
                });
            }
        }
    }

    function setReferencePropertyValue(details, value, operation) {
        setReferencePropertyBaseValue(
            details, this,
            value, operation, false);
    }

    function rawGetNavigationPropertyValue(
        details,
        entry) {
        return getNavigationPropertyValueWithoutLoading(
            details,
            entry,
            getNavigationPropertyData(details, entry));
    }

    function setVirtualReferencePropertyValue(details, value, operation) {
        setReferencePropertyBaseValue(
            details, this,
            value, operation, true);
    }

    function defineEntity(constructor, properties) {
        var entityClass = constructor,
            details = makeEntityDetails(constructor),
            mixInContent = {};

        msls_defineClassWithDetails(null, null,
            constructor, details, _Entity);

        if (properties) {
            properties.forEach(function (entry) {
                var cEntry,
                    entryName = entry.name;
                entry.serviceName = entryName;
                if (typeof entry.kind !== "string") {
                    entry.kind = "storage";
                }
                switch (entry.kind) {
                    case "storage":
                        if (!entry.type) {
                            entry.type = String;
                        }
                        mixInContent[entryName] = msls_propertyWithDetails(
                            entry, entry.type, _StorageProperty);
                        entry.getValue = getStoragePropertyValue;
                        if (!entry.isReadOnly) {
                            entry.setValue = setStoragePropertyValue;
                        }
                        break;
                    case "reference":
                    case "virtualReference":
                        if (!entry.type) {
                            entry.type = _Entity;
                        }
                        mixInContent[entryName] = msls_propertyWithDetails(
                            entry, entry.type, _ReferenceProperty);
                        entry.async = true;
                        entry.getValue = getNavigationPropertyValue;
                        if (entry.kind === "reference") {
                            entry.setValue = setReferencePropertyValue;
                        } else {
                            entry.setValue = setVirtualReferencePropertyValue;
                        }
                        break;
                    case "collection":
                    case "virtualCollection":
                        entry.type = _EntityCollection;
                        mixInContent[entryName] = msls_propertyWithDetails(
                            entry, entry.type, _CollectionProperty);
                        entry.async = true;
                        entry.getValue = getNavigationPropertyValue;
                        entry.rawGet = rawGetNavigationPropertyValue;
                        break;
                }
                entry.get = function () {
                    return entry.getValue(this.details);
                };
                if (entry.setValue) {
                    if (entry.async) {
                        entry.set = function (value, operation) {
                            entry.setValue(this.details, value, operation);
                        };
                    } else {
                        entry.set = function (value) {
                            entry.setValue(this.details, value);
                        };
                    }
                }
            });
            msls_mixIntoExistingClass(entityClass, mixInContent);
        }
        return entityClass;
    }

    function isReferencePropertyChangedAfterMerge(
        entity,
        entityDetails,
        entityData,
        newEntityData,
        propertyEntry) {

        var result = false,
            propertyData,
            propertyModel,
            propertyAssociationSetEndName,
            propertyAssociationSetEnds,
            propertyAssociationSetEnd,
            i, len,
            backingModelStorageProperties,
            backingStorageProperties,
            backingStorageProperty,
            backingStoragePropertyServiceName,
            oldVirtualReferenceEntity;

        if (!isVirtualNavigationProperty(propertyEntry)) {
            return result;
        }

        propertyData = getNavigationPropertyData(entityDetails, propertyEntry);
        propertyModel = propertyData.model;
        propertyAssociationSetEndName = propertyModel.fromEnd.name;
        propertyAssociationSetEnds = propertyData.associationSet.ends;
        for (i = 0, len = propertyAssociationSetEnds.length; i < len; i++) {
            propertyAssociationSetEnd =
                propertyAssociationSetEnds[i];
            if (propertyAssociationSetEnd.name === propertyAssociationSetEndName) {
                backingModelStorageProperties = propertyAssociationSetEnd.properties;
                break;
            }
        }

        backingStorageProperties = getStoragePropertiesForAssociationSetEnd(
            entityDetails, backingModelStorageProperties, true);
        for (i = 0, len = backingStorageProperties.length; i < len; i++) {
            backingStorageProperty = backingStorageProperties[i];
            backingStoragePropertyServiceName =
                backingStorageProperty._entry.serviceName;

            if (!msls_isSameValue(
                entityData[backingStoragePropertyServiceName],
                newEntityData[backingStoragePropertyServiceName])) {

                oldVirtualReferenceEntity = getNavigationPropertyValueWithoutLoading(
                        entityDetails, propertyEntry, propertyData);
                if (oldVirtualReferenceEntity) {
                    propertyData.linkSet.deleteReferenceLink(
                        propertyModel.fromEnd.name, entity,
                        propertyModel.toEnd.name, oldVirtualReferenceEntity);
                }

                propertyData.state = navigationPropertyState.unavailable;
                refreshNavigationPropertyQuery(
                    entityDetails, newEntityData, propertyEntry, propertyData, true);

                result = true;

                break;
            }
        }

        return result;
    }

    msls_replaceEntityData =
    function replaceEntityData(entity, newEntityData) {

        var entityDetails = entity.details,
            entityData = entityDetails._,
            properties = entityDetails.properties.all(),
            i, len = properties.length,
            property,
            serviceName,
            updatedProperties = [],
            dataServiceDetails = entityDetails.entitySet.dataService.details;

        for (i = 0; i < len; i++) {
            property = properties[i];
            if (property instanceof _StorageProperty) {
                serviceName = property._entry.serviceName;
                if (!msls_isSameValue(entityData[serviceName], newEntityData[serviceName])) {
                    updatedProperties.push(property);
                }

            } else if (property instanceof _ReferenceProperty) {
                if (isReferencePropertyChangedAfterMerge(
                    entity,
                    entityDetails,
                    entityData,
                    newEntityData,
                    property._entry)) {

                    updatedProperties.push(property);
                }
            }
        }

        entityDetails._ = newEntityData;

        for (i = 0, len = updatedProperties.length; i < len; i++) {
            property = updatedProperties[i];
            property.dispatchChange("value");
            entity.dispatchChange(property.name);
            dataServiceDetails.dispatchEvent("contentchange", property);
        }
    };

    function mergeEntity(entity, newEntityData, mergeOption) {

        if (mergeOption === msls.MergeOption.unchangedOnly &&
            entity.details.entityState === _EntityState.unchanged) {

            msls_replaceEntityData(entity, newEntityData);
        }
    }

    msls_loadEntity =
    function loadEntity(entitySet, entityData, mergeOption) {
        var uri = entityData.__metadata.uri,
            entity = entitySet._loadedEntities[uri];
        if (!entity) {
            static_loadedEntityData = entityData;
            entity = new entitySet._entityType(entitySet);
            static_loadedEntityData = null;
            entitySet._loadedEntities[uri] = entity;
        } else {
            mergeEntity(
                entity, entityData, mergeOption);
        }
        return entity;
    };

    msls_loadExpandedEntities =
    function loadExpandedEntities(
        sourceEntity,
        sourcePropertyEntry,
        targetEntitySet,
        navigationPropertyData,
        mergeOption,
        newEntities,
        newEntitiesData) {


        var targetEntitiesData = [],
            targetEntities = [],
            sourcePropertyData = getNavigationPropertyData(
                sourceEntity.details, sourcePropertyEntry),
            sourcePropertyModel = sourcePropertyEntry.data.model;

        if (navigationPropertyData) {
            if (Array.isArray(navigationPropertyData.results)) {
                targetEntitiesData = navigationPropertyData.results;
            } else if (Array.isArray(navigationPropertyData)) {
                targetEntitiesData = navigationPropertyData;
            } else {
                targetEntitiesData = [navigationPropertyData];
            }
        }

        targetEntitiesData.forEach(function (targetEntityData) {
            var targetEntity = msls_loadEntity(
                    targetEntitySet, targetEntityData, mergeOption);

            targetEntities.push(targetEntity);
            newEntities.push(targetEntity);
            newEntitiesData.push(targetEntityData);
        });

        mergeNavigationProperty(sourceEntity, sourcePropertyEntry,
            sourcePropertyData, targetEntities, mergeOption, false);

        if (isCollectionNavigationProperty(sourcePropertyEntry)) {
            setNavigationPropertyIsLoaded(sourceEntity.details,
                sourcePropertyEntry, sourcePropertyData);
        }
    };

    msls_expose("EntityState", _EntityState);
    msls_expose("Entity", _Entity);
    msls_expose("EntityCollection", _EntityCollection);
    msls_expose("_defineEntity", defineEntity);

}());

var msls_parseDateTimeOffset,
    msls_getDecimalPlaces,
    msls_ensureDecimalIsNumber,
    msls_convertToStringForType,
    msls_convertToString,
    msls_getEmailAddressExpressions,
    msls_convertFromString;

(function () {
    msls_parseDateTimeOffset =
    function parseDateTimeOffset(stringValue) {
        if (!!stringValue) {
            var sections = stringValue.split(" "),
                result,
                dateSections,
                timeSections,
                timeOffsetSections,
                year, month, day, hour, minute, second, milliseconds, minuteOffset;
            if (sections.length > 2) {
                dateSections = sections[0].split("/");
                year = parseInt(dateSections[2], 10);
                month = parseInt(dateSections[0], 10) - 1;
                day = parseInt(dateSections[1], 10);
                timeSections = sections[1].split(":");
                hour = parseInt(timeSections[0], 10);
                minute = parseInt(timeSections[1], 10);
                second = Math.floor(parseInt(timeSections[2], 10) * 1000);
                milliseconds = second % 1000;
                second = (second - milliseconds) / 1000;
                result = new Date(Date.UTC(year, month, day, hour, minute, second, milliseconds));
                timeOffsetSections = sections[2].substr(1).split(":");
                minuteOffset = parseInt(timeOffsetSections[0], 10) * 60 + parseInt(timeOffsetSections[1], 10);
                if (!!minuteOffset) {
                    if (sections[2].charAt(0) === "+") {
                        result.setMinutes(result.getMinutes() - minuteOffset);
                    } else {
                        result.setMinutes(result.getMinutes() + minuteOffset);
                    }
                }
                return result;
            }
        }
        return null;
    };

    function generalDateLongTimeFormat() {

        var p = Globalize.culture().calendars.standard.patterns;
        return p.d + " " + p.T;
    }

    function generalDateShortTimeFormat() {

        var p = Globalize.culture().calendars.standard.patterns;
        return p.d + " " + p.t;
    }

    msls_getDecimalPlaces =
    function getDecimalPlaces(value) {

        var stringValue = (value === null || value === undefined) ? "" : value.toString(),
            i = stringValue.indexOf(".");
            return i !== -1 ? (stringValue.length - i - 1) : 0;
    };

    msls_ensureDecimalIsNumber =
    function ensureDecimalIsNumber(value) {
        if (value === "") {
            return null;
        } else if (value === null || value === undefined) {
            return value;
        } else {
            return parseFloat(value.toString());
        }
    };

    function formatTimeElement(value) {
        if (value < 10) {
            return "0" + value.toString();
        } else {
            return value.toString();
        }
    }

    function getTimeSpanStringValueFromValue(value) {
        var t = value,
            sign = "",
            ms,
            days,
            hours,
            minutes,
            seconds;
        ms = t.ms;
        if (ms < 0) {
            sign = "-";
            ms = -ms;
        }
        days = Math.floor(ms / 86400000);
        ms -= 86400000 * days;
        hours = Math.floor(ms / 3600000);
        ms -= 3600000 * hours;
        minutes = Math.floor(ms / 60000);
        ms -= 60000 * minutes;
        seconds = Math.floor(ms / 1000);
        ms -= seconds * 1000;
        return sign + ((days > 0) ? days.toString() + "." : "") + formatTimeElement(hours) + ":" + formatTimeElement(minutes) +
                        ":" + formatTimeElement(seconds) + ((ms > 0) ? "." + ms.toString() : "");
    }

    msls_convertToStringForType =
    function convertToStringForType(value, typeId) {

        var stringValue = "";
        switch (typeId) {
            case ":Date":
                stringValue = Globalize.format(value, "d");
                break;
            case ":DateTime":
            case ":DateTimeOffset":
                stringValue = Globalize.format(value, generalDateLongTimeFormat());
                break;
            case ":TimeSpan":
                stringValue = getTimeSpanStringValueFromValue(value);
                break;
            case ":Decimal":
            case ":Double":
            case ":Single":
                if (typeId === ":Decimal") {
                    value = msls_ensureDecimalIsNumber(value);
                }

                stringValue = Globalize.format(value, "n" + msls_getDecimalPlaces(value).toString());
                break;
            default:
                stringValue = value.toString();
                break;
        }
        return stringValue;
    };

    msls_convertToString =
    function convertToString(value, propertyDefinition) {

        var stringValue = "",
            underlyingTypes,
            primitiveTypeId,
            semanticTypeId,
            decimalPlaces,
            scale;

        if (value !== undefined && value !== null) {

            underlyingTypes = msls_getUnderlyingTypes(propertyDefinition.propertyType);
            primitiveTypeId = underlyingTypes.primitiveType.id;
            semanticTypeId = underlyingTypes.semanticType ? underlyingTypes.semanticType.id : "";


            if (semanticTypeId === ":Date") {
                stringValue = msls_convertToStringForType(value, semanticTypeId);
            } else {
                stringValue = msls_convertToStringForType(value, primitiveTypeId);
            }
        }
        return stringValue;
    };

    msls_getEmailAddressExpressions =
    function getEmailAddressExpressions() {
        return [
            /^\s*\S+.*/,
            /^\s*\S+.*@\S+\s*$/
        ];
    };

    msls_convertFromString =
    function convertFromString(stringValue, propertyDefinition) {


        var stringValue_lc,
            value,
            error,
            propertyType = propertyDefinition.propertyType,
            underlyingTypes = msls_getUnderlyingTypes(propertyType),
            primitiveTypeId = underlyingTypes.primitiveType.id,
            semanticTypeId = underlyingTypes.semanticType ? underlyingTypes.semanticType.id : "",
            min,
            max,
            expression,
            numberFormat = Globalize.culture().numberFormat;

        if (primitiveTypeId === ":String" &&
            stringValue === "" &&
            !!msls_getAttribute(propertyDefinition, ":@Required") &&
            !!msls_getAttribute(propertyDefinition, ":@AllowEmptyString")) {
            return { value: "" };
        }

        if (!stringValue) {
            return { value: null };
        }

        stringValue_lc = stringValue.toLowerCase();

        if (primitiveTypeId === ":Byte" || primitiveTypeId === ":Int16" || primitiveTypeId === ":Int32" || primitiveTypeId === ":Int64") {
            value = Globalize.parseInt(stringValue);
            if (isNaN(value) || stringValue.indexOf(numberFormat["."]) !== -1) {
                error = msls_getResourceString("validation_invalidValue_integer");
            } else {
                if (primitiveTypeId === ":Byte") {
                    min = 0;
                    max = 255;
                } else if (primitiveTypeId === ":Int16") {
                    min = -65536;
                    max = 65535;
                } else if (primitiveTypeId === ":Int32") {
                    min = -4294967296;
                    max = 4294967295;
                } else if (primitiveTypeId === ":Int64") {
                    min = -18446744073709551616;
                    max = 18446744073709551615;
                }


                if (value < min || value > max) {
                    error = msls_getResourceString("validation_invalidRange_2args", Globalize.format(min, "n"), Globalize.format(max, "n"));
                }
            }
        } else if (primitiveTypeId === ":Decimal" || primitiveTypeId === ":Double" || primitiveTypeId === ":Single") {
            value = Globalize.parseFloat(stringValue);
            if (isNaN(value) ||
                stringValue.indexOf(numberFormat.currency.symbol) !== -1 ||
                stringValue.indexOf(numberFormat.percent.symbol) !== -1) {
                error = msls_getResourceString("validation_invalidValue_decimal");
            }
        } else if (primitiveTypeId === ":Boolean") {
            value = stringValue_lc === "true" || stringValue_lc === "1";
            if (!value) {
                if (stringValue_lc !== "false" && stringValue_lc !== "0") {
                    error = msls_getResourceString("validation_invalidValue_boolean");
                }
            }
        } else if (semanticTypeId === ":Date" || primitiveTypeId === ":DateTime" || primitiveTypeId === ":DateTimeOffset") {
            value = Globalize.parseDate(stringValue, [generalDateLongTimeFormat(), generalDateShortTimeFormat()]);
            if (!value || isNaN(value.getFullYear())) {
                value = Globalize.parseDate(stringValue);
                if (!value || isNaN(value.getFullYear())) {
                    if (semanticTypeId === ":Date") {
                        error = msls_getResourceString("validation_invalidValue_date");
                    } else {
                        error = msls_getResourceString("validation_invalidValue_dateTime");
                    }
                }
            } else if (semanticTypeId === ":Date") {
                value.setHours(0, 0, 0, 0);
            }
        } else if (primitiveTypeId === ":TimeSpan") {
            var parts,
                days,
                hours,
                minutes,
                seconds,
                milliseconds,
                ms;
            expression = /^\s*(\+|-)?((\d+)?\.)?(\d{1,2})?:{0,1}(\d{1,2})?:{0,1}(\d{1,2})?(\.(\d{1,7})?)?\s*$/;
            parts = expression.exec(stringValue);
            if (parts === null) {
                error = msls_getResourceString("validation_invalidValue_timespan");
            } else {
                days = parseInt(parts[3] || "0", 10),
                hours = parseInt(parts[4] || "0", 10),
                minutes = parseInt(parts[5] || "0", 10),
                seconds = parseInt(parts[6] || "0", 10);
                milliseconds = parseInt((parts[8] || "0").slice(0, 3), 10);
                if (hours > 23 || minutes > 59 || seconds > 59 || milliseconds > 999) {
                    error = msls_getResourceString("validation_invalidRange_timespan");
                } else {
                    ms = days * 86400000 + hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
                    if (parts[1] === "-") {
                        ms = -ms;
                    }
                    value = { ms: ms, __edmType: "Edm.Time" };
                }
            }
        } else if (primitiveTypeId === ":Guid") {
            value = stringValue;
            expression = /^(\{{0,1}([0-9a-fA-F]){8}(-([0-9a-fA-F]){4}){3}-([0-9a-fA-F]){12}\}{0,1})$/;
            if (!expression.test(value)) {
                error = msls_getResourceString("validation_invalidValue_guid");
            }
        } else if (semanticTypeId === msls_builtIn_extensionName + ":WebAddress") {
            expression = /^\s*(http|https):\/\/(.*)$/;
            if (!expression.test(stringValue)) {
                value = "http://" + stringValue.replace(/^\s*/, "").replace(/\s*$/, "");
            } else {
                value = stringValue;
            }
        } else if (semanticTypeId === msls_builtIn_extensionName + ":EmailAddress") {
            var expressions = msls_getEmailAddressExpressions(),
                attribute = msls_getAttribute(propertyDefinition, msls_builtIn_extensionName + ":@EmailAddressProperties"),
                localPart = stringValue.replace(/@.*$/, "");
            if (!expressions[1].test(stringValue) &&
                !!attribute && !!attribute.defaultDomain &&
                expressions[0].test(localPart)) {
                value = localPart + "@" + attribute.defaultDomain.replace(/^\s*@/, "");
            } else {
                value = stringValue;
            }
        } else {
            value = stringValue;
        }
        return { value: error ? null : value, error: error };
    };

}());

(function () {

    var _Link = msls.Link,
        _LinkState = msls.LinkState,
        _LinkSet = msls.LinkSet,
        _EntityState = msls.EntityState;

    function getLastLinkStateData(states) {
        var stateData;
        if (states.length > 0) {
            stateData = states[states.length - 1];
        }
        return stateData;
    }

    msls_mixIntoExistingClass(_Link, {
        state: msls_accessorProperty(function state_get() {
            var states = this._states;
            if (states) {
                return getLastLinkStateData(states).state;
            } else {
                return _LinkState.unchanged;
            }
        })
    });

    function createLinkStateData(state, changeSetIndex) {
        return { state: state, changeSetIndex: changeSetIndex };
    }

    msls_initLink =
    function initLink(link, end1, endEntity1, end2, endEntity2, state, changeSetIndex) {

        link[end1] = endEntity1;
        link[end2] = endEntity2;

        if (state === _LinkState.added) {
            link._states = [];
            link._states.push(createLinkStateData(state, changeSetIndex));
        }
    };

    function getLinkIdCore(entity1Details, entity2Details) {

        return entity1Details._.__metadata.uri + " " +
               entity2Details._.__metadata.uri;
    }

    function getLinkId(me, end1, entity1Details, end2, entity2Details) {
        var firstEntityDetails, secondEntityDetails;
        if (end1 === me._endNames[0]) {
            firstEntityDetails = entity1Details,
            secondEntityDetails = entity2Details;
        } else {
            firstEntityDetails = entity2Details;
            secondEntityDetails = entity1Details;
        }
        return getLinkIdCore(firstEntityDetails, secondEntityDetails);
    }

    function attachLink(end1, entity1, end2, entity2) {
        var loadedLinks = this._loadedLinks,
            linkId = getLinkId(this, end1, entity1.details, end2, entity2.details),
            link = loadedLinks[linkId];
        if (!link) {
            loadedLinks[linkId] = new _Link(end1, entity1, end2, entity2, _LinkState.unchanged);
        }
    }

    function each(me, callback, reverseAddedLinks) {
        var addedLinks = me._addedLinks,
            continueNext = true;
        if (reverseAddedLinks) {
            for (var j = addedLinks.length - 1; j >= 0; j--) {
                continueNext = callback(addedLinks[j], j);
                if (continueNext === false) {
                    break;
                }
            }
        } else {
            $.each(addedLinks, function (i, link) {
                continueNext = callback(link, i);
                return continueNext;
            });
        }
        if (continueNext !== false) {
            $.each(me._loadedLinks, function (i, link) {
                continueNext = callback(link, i);
                return continueNext;
            });
        }
    }

    function tryGetActiveTargetEntity(link, fromEnd, fromEntity, toEnd) {

        var result,
            linkState = link.state,
            toEntity,
            toEntityState;

        if (link[fromEnd] === fromEntity &&
            (linkState === _LinkState.added ||
             linkState === _LinkState.unchanged)) {
            toEntity = link[toEnd];
            toEntityState = toEntity.details.entityState;
            if (toEntityState !== _EntityState.deleted &&
                toEntityState !== _EntityState.discarded) {
                result = toEntity;
            }
        }

        return result;
    }

    function getTargetEntitiesCore(me, fromEnd, fromEntity, toEnd, firstOrDefault) {
        var result = [], toEntity;
        each(me, function (link) {
            toEntity = tryGetActiveTargetEntity(
                link, fromEnd, fromEntity, toEnd);
            if (toEntity) {
                result.push(toEntity);
                return !firstOrDefault;
            }
            return true;
        });
        return result;
    }

    function getTargetEntities(fromEnd, fromEntity, toEnd) {
        return getTargetEntitiesCore(
            this, fromEnd, fromEntity, toEnd);
    }

    function getTargetEntity(fromEnd, fromEntity, toEnd) {
        return getTargetEntitiesCore(
            this, fromEnd, fromEntity, toEnd, true)[0];
    }

    function getAddedEntities(fromEnd, fromEntity, toEnd) {
        var results = [],
            toEntity;
        this._addedLinks.forEach(function (link) {
            toEntity = tryGetActiveTargetEntity(
                link, fromEnd, fromEntity, toEnd);
            if (toEntity) {
                results.push(toEntity);
            }
        });
        return results;
    }

    function hasLinks(fromEnd, fromEntity) {
        var linkFound = false;
        each(this, function (link) {
            linkFound = (link[fromEnd] === fromEntity);
            return !linkFound;
        });
        return linkFound;
    }

    function setLinkState(link, state, changeSetIndex) {

        var states = link._states,
            stateData;
        if (!states) {
            states = link._states = [];
        }
        stateData = getLastLinkStateData(states);
        if (!!stateData && stateData.changeSetIndex === changeSetIndex) {
            stateData.state = state;
        } else {
            states.push(createLinkStateData(state, changeSetIndex));
        }
    }

    function setReferenceLink(fromEnd, fromEntity, toEnd, toEntity) {

        var
        changeSetIndex = fromEntity.details._.__changeSetIndex,
        toPropertyName = this._propertyNames[toEnd],
        existingLoadedLink,
        existingAddedLink,
        activeLink,
        originalEntity;

        each(this, function (link) {
            if (link[fromEnd] === fromEntity) {
                if (link[toEnd] === toEntity) {
                    if (link.state === _LinkState.unchanged || link.state === _LinkState.deleted) {
                        existingLoadedLink = link;
                    } else {
                        existingAddedLink = link;
                    }
                }
                if (link.state === _LinkState.unchanged || link.state === _LinkState.added) {
                    activeLink = link;
                }
            }
            return !(existingLoadedLink && existingAddedLink && activeLink);
        });

        if (!!activeLink) {
            if (activeLink.state === _LinkState.unchanged) {
                setLinkState(activeLink, _LinkState.deleted, changeSetIndex);
                originalEntity = activeLink[toEnd];
            } else {
                setLinkState(activeLink, _LinkState.discarded, changeSetIndex);
            }
            msls_Entity_raiseNavigationPropertyChanged(
                activeLink[toEnd], toPropertyName, msls_CollectionChangeAction.remove, fromEntity);
        }
        if (toEntity) {
            if (!!existingAddedLink) {
                setLinkState(existingAddedLink, _LinkState.added, changeSetIndex);
            } else {
                if (!!existingLoadedLink && existingLoadedLink.state === _LinkState.unchanged) {
                    setLinkState(existingLoadedLink, _LinkState.deleted, changeSetIndex);
                }
                this._addedLinks.push(new _Link(fromEnd, fromEntity, toEnd, toEntity, _LinkState.added, changeSetIndex));
            }
            msls_Entity_raiseNavigationPropertyChanged(
                toEntity, toPropertyName, msls_CollectionChangeAction.add, fromEntity);
        }

        return originalEntity;
    }

    function deleteReferenceLink(fromEnd, fromEntity, toEnd, toEntity) {

        var me = this,
            loadedLinks = me._loadedLinks,
            linkId = getLinkId(
                me, fromEnd, fromEntity.details, toEnd, toEntity.details),
            link = loadedLinks[linkId];


        if (link) {
            delete loadedLinks[linkId];

            msls_Entity_raiseNavigationPropertyChanged(
                toEntity, me._propertyNames[toEnd],
                msls_CollectionChangeAction.remove, fromEntity);
        }
    }

    function getAnyReferenceEntity(fromEnd, fromEntity, toEnd) {
        var toEntity;

        each(this, function (link) {
            if (link.state !== _LinkState.discarded &&
                link[fromEnd] === fromEntity) {
                toEntity = link[toEnd];
                return false;
            }
            return true;
        });

        return toEntity;
    }

    function discardReferenceChanges(fromEnd, fromEntity, toEnd) {
        var me = this,
            toPropertyName = me._propertyNames[toEnd],
            state;
        each(me, function (link, i) {
            if (link[fromEnd] === fromEntity) {
                state = link.state;


                if (state === _LinkState.added || state === _LinkState.discarded) {
                    me._addedLinks.splice(i, 1);
                    if (state === _LinkState.added) {
                        msls_Entity_raiseNavigationPropertyChanged(
                            link[toEnd], toPropertyName, msls_CollectionChangeAction.remove, fromEntity);
                    }
                } else if (state === _LinkState.deleted) {
                    link._states = null;
                    msls_Entity_raiseNavigationPropertyChanged(
                        link[toEnd], toPropertyName, msls_CollectionChangeAction.add, fromEntity);
                }
            }
        }, true);
    }

    function cancelReferenceChanges(fromEnd, fromEntity, toEnd) {
        var me = this,
            toPropertyName = me._propertyNames[toEnd],
            stateData, state,
            addedLink,
            newRelatedEntity, cancelResult;

        each(me, function (link, i) {
            if (link[fromEnd] === fromEntity) {

                stateData = getLastLinkStateData(link._states);
                if (stateData.changeSetIndex === fromEntity.details._.__changeSetIndex) {
                    state = stateData.state;

                    if (state === _LinkState.added || state === _LinkState.discarded) {
                        if (state === _LinkState.added) {

                            addedLink = link;
                        }

                        cancelResult = cancelLink(me, fromEntity, toEnd, toPropertyName, link, i, state);
                        if (cancelResult) {
                            newRelatedEntity = cancelResult;
                        }
                    } else {


                        link._states = null;
                        newRelatedEntity = link[toEnd];
                    }
                }
            }
        }, true);

        if (addedLink) {
            msls_Entity_raiseNavigationPropertyChanged(
                addedLink[toEnd], toPropertyName, msls_CollectionChangeAction.remove, fromEntity);
        }

        if (newRelatedEntity) {
            msls_Entity_raiseNavigationPropertyChanged(
                newRelatedEntity, toPropertyName, msls_CollectionChangeAction.add, fromEntity);
        }

        return newRelatedEntity;
    }

    function cancelLink(me, fromEntity, toEnd, toPropertyName, link, index, linkState) {

        var states = link._states,
            newRelatedEntity;
        if (states.length === 1) {
            me._addedLinks.splice(index, 1);
            states = null;
        } else {
            states.pop();
        }
        if (!!states && link.state === _LinkState.added) {
            newRelatedEntity = link[toEnd];
        }
        return newRelatedEntity;
    }

    function applyReferenceChanges(fromEnd, fromEntity, toEnd) {
        var states,
            stateData,
            currentIndex,
            parentIndex;

        each(this, function (link) {
            if (link[fromEnd] === fromEntity) {
                states = link._states;

                stateData = getLastLinkStateData(states);
                currentIndex = stateData.changeSetIndex;
                if (currentIndex === fromEntity.details._.__changeSetIndex) {

                    if (states.length > 1) {
                        parentIndex = states.length - 2;
                        if (states[parentIndex].changeSetIndex === currentIndex - 1) {
                            states.splice(parentIndex, 1);
                        }
                    }

                    stateData.changeSetIndex -= 1;
                }
            }
        });
    }

    function resetAfterSave() {
        var me = this,
            end1 = me._endNames[0],
            end2 = me._endNames[1],
            loadedLinks = me._loadedLinks;

        each(me, function (link, i) {

            var entity1, entity2,
                entity1Details, entity2Details;

            switch (link.state) {
                case _LinkState.added:

                    entity1 = link[end1];
                    entity2 = link[end2];
                    entity1Details = entity1.details;
                    entity2Details = entity2.details;

                    if (entity1Details.entityState === _EntityState.unchanged &&
                        entity2Details.entityState === _EntityState.unchanged) {
                        link._states = null;
                        loadedLinks[getLinkIdCore(entity1Details, entity2Details)] = link;
                    }
                    break;

                case _LinkState.deleted:

                    delete loadedLinks[i];
                    break;

                default:
                    break;
            }
        });

        me._addedLinks.length = 0;
    }

    msls_mixIntoExistingClass(_LinkSet, {
        attachLink: attachLink,
        getTargetEntities: getTargetEntities,
        getTargetEntity: getTargetEntity,
        getAddedEntities: getAddedEntities,
        hasLinks: hasLinks,
        setReferenceLink: setReferenceLink,
        deleteReferenceLink: deleteReferenceLink,
        getAnyReferenceEntity: getAnyReferenceEntity,
        discardReferenceChanges: discardReferenceChanges,
        cancelReferenceChanges: cancelReferenceChanges,
        applyReferenceChanges: applyReferenceChanges,
        resetAfterSave: resetAfterSave
    });

    msls_initLinkSet =
    function initLinkSet(linkSet, endNames, propertyNames) {
        msls_setProperty(linkSet, "_endNames", endNames);
        msls_setProperty(linkSet, "_propertyNames", propertyNames);
        msls_setProperty(linkSet, "_loadedLinks", {});
        msls_setProperty(linkSet, "_addedLinks", []);
    };

}());

var msls_relativeDates_now;

(function () {
    var monthsPerQuarter = 3;

    msls_relativeDates_now = function () {
        return new Date();
    };

    function addMilliseconds(date, value) {
        date.setMilliseconds(date.getMilliseconds() + value);
    }

    function addDays(date, value) {
        addMilliseconds(date, value * 86400000);
    }

    var relativeDatesMembers = {
        now: function now() {
            return msls_relativeDates_now();
        },
        today: function today() {
            var result = this.now();
            result.setHours(0);
            result.setMinutes(0);
            result.setSeconds(0);
            result.setMilliseconds(0);
            
            return result;
        },
        endOfDay: function endOfDay() {
            var result = this.now();
            result.setHours(23);
            result.setMinutes(59);
            result.setSeconds(59);
            result.setMilliseconds(999);

            return result;
        },
        startOfWeek: function startOfWeek() {
            var result = this.today();
            addDays(result, 0 - result.getDay());

            return result;
        },
        endOfWeek: function endOfWeek() {
            var result = this.startOfWeek();
            addDays(result, 7);
            addMilliseconds(result, -1);

            return result;
        },
        startOfMonth: function startOfMonth() {
            var result = this.today();
            result.setDate(1);

            return result;
        },
        endOfMonth: function endOfMonth() {
            var result = this.startOfMonth();
            result.setMonth(result.getMonth() + 1);
            addMilliseconds(result, -1);

            return result;
        },
        startOfQuarter: function startOfQuarter() {
            var result = this.startOfMonth(),
                month = result.getMonth();
            result.setMonth(month - month % monthsPerQuarter);

            return result;
        },
        endOfQuarter: function endOfQuarter() {
            var result = this.startOfMonth(),
                month = result.getMonth();
            result.setMonth(month - month % monthsPerQuarter + monthsPerQuarter);
            addMilliseconds(result, -1);

            return result;
        },
        startOfYear: function startOfYear() {
            var result = this.today();
            result.setMonth(0, 1);

            return result;
        },
        endOfYear: function endOfYear() {
            var result = this.startOfYear();
            result.setFullYear(result.getFullYear() + 1);
            addMilliseconds(result, -1);

            return result;
        },
    };

    msls_addToInternalNamespace("relativeDates", relativeDatesMembers);
    msls_addToInternalNamespace("relativeDateTimeOffsetDates", relativeDatesMembers);


    msls_expose("relativeDates", msls.relativeDates);
    msls_expose("relativeDateTimeOffsetDates", msls.relativeDates);
}());

(function () {

    var
        _AuthenticationType = {
            notDetermined: "NotDetermined",
            forms: "Forms"
        },
        authenticationType = _AuthenticationType.notDetermined,
        getAuthenticationTypePromise = new WinJS.Promise(
            function initLoad(complete, error) {
                try {
                    OData.request({
                        headers: {
                            accept: "application/json;odata=verbose"
                        },
                        requestUri: msls_appRootUri +
                            "/Microsoft.LightSwitch.SecurityData.svc/GetAuthenticationType",
                        method: "GET"
                    }, function (data) {
                        authenticationType = data.GetAuthenticationType;
                        complete(authenticationType);
                    }, function (err) {
                        complete(authenticationType);
                    });
                } catch (exc) {
                    complete(authenticationType);
                }
            });

    msls_setProperty(msls, "securityDataService", {
        AuthenticationType: _AuthenticationType,
        getAuthenticationType: function getAuthenticationType() {
            return getAuthenticationTypePromise;
        }
    });
}());

var msls_validate,
    msls_tryGetPhoneNumberFormats;

(function () {

    var validators,
        _EntityState = msls.EntityState,
        phoneNumberValidation = msls_builtIn_extensionName + ":@PhoneNumberValidation",
        emailAddressValidation = msls_builtIn_extensionName + ":@EmailAddressValidation",
        emailAddressProperties = msls_builtIn_extensionName + ":@EmailAddressProperties";


    function validateLength(modelItem, property, id, value) {
        var validationResult,
            attribute = msls_getAttribute(modelItem, ":@MaxLength");

        if (attribute) {
            var propValue = value,
                message;

            if (!!propValue && !!propValue.length && propValue.length > attribute.value) {
                message = msls_getResourceString("validation_max_length_1args", attribute.value);
                validationResult = new msls_ValidationResult(property, message);
            }
        }

        return validationResult;
    }

    function validateRequired(modelItem, property, id, value) {
        var validationResult,
            attribute = msls_getAttribute(modelItem, ":@Required"),
            propDef = modelItem,
            isEmptyString = false;

        if (attribute) {
            if (value === "" &&
                msls_getUnderlyingTypes(propDef.propertyType).primitiveType.id === ":String" &&
                !msls_getAttribute(modelItem, ":@AllowEmptyString")) {
                isEmptyString = true;
            }
            if (value === undefined || value === null || isEmptyString) {
                validationResult = new msls_ValidationResult(property, msls_getResourceString("validation_required"));
            }
        }

        return validationResult;
    }

    function validateRange(modelItem, property, id, value) {
        var validationResult,
            attribute = msls_getAttribute(modelItem, ":@Range"),
            minValue,
            maxValue,
            baseDateTimeType = null,
            message = null;

        if (attribute) {

            switch (id) {
                case ":Date":
                case ":Date?":
                    baseDateTimeType = ":Date";
                    minValue = new Date(attribute.minimum);
                    maxValue = new Date(attribute.maximum);
                    break;
                case ":DateTime":
                case ":DateTime?":
                    baseDateTimeType = ":DateTime";
                    minValue = new Date(attribute.minimum);
                    maxValue = new Date(attribute.maximum);
                    break;
                case ":DateTimeOffset":
                case ":DateTimeOffset?":
                    baseDateTimeType = ":DateTimeOffset";
                    minValue = msls_parseDateTimeOffset(attribute.minimum);
                    maxValue = msls_parseDateTimeOffset(attribute.maximum);
                    break;
                default:
                    if (value !== undefined && value !== null) {
                        var numericValue = parseFloat(value);
                        if (numericValue < attribute.minimum || numericValue > attribute.maximum) {
                            message = msls_getResourceString("validation_invalidRange_2args", attribute.minimum, attribute.maximum);
                        }
                    }
                    break;
            }

            if (!!baseDateTimeType) {
                if (!!value && ((!!minValue && value.getTime() < minValue.getTime()) || (!!maxValue && value.getTime() > maxValue.getTime()))) {
                    message = msls_getResourceString("validation_invalidRange_2args",
                                    attribute.minimum && msls_convertToStringForType(minValue, baseDateTimeType),
                                    attribute.maximum && msls_convertToStringForType(maxValue, baseDateTimeType));
                }
            }
            if (!!message) {
                validationResult = new msls_ValidationResult(property, message);
            }
        }

        return validationResult;
    }

    function validateDecimalConstraint(modelItem, property, id, value) {
        var validationResult,
            attribute = msls_getAttribute(modelItem, ":@DecimalConstraint"),
            propValue,
            parts,
            precision,
            scale,
            message;

        if (!!value && !!attribute) {
            propValue = Math.abs(value);
            parts = propValue.toString().split(".");
            precision = attribute.precision;
            scale = attribute.scale;
            if (parts[0].length > precision - scale) {
                message = msls_getResourceString("validation_decimalconstraints_precision_length_2args", propValue, precision - scale);
            } else if (!!parts[1] && parts[1].length > scale) {
                message = msls_getResourceString("validation_decimalconstraints_scale_length_2args", propValue, scale);
            }
            if (message) {
                validationResult = new msls_ValidationResult(property, message);
            }
        }

        return validationResult;
    }

    msls_tryGetPhoneNumberFormats =
    function tryGetPhoneNumberFormats(attribute) {
        var expression,
            formats,
            part,
            previous,
            count;

        formats = attribute.formats;
        if (formats) {
            attribute.__regexparray = [];
            attribute.__formatarray = formats.split(";");
            for (var i = 0, len = attribute.__formatarray.length; i < len; i++) {
                part = attribute.__formatarray[i].replace(/[^ACN]/gi, " ").replace(/\s{2,}/g, ' ').replace(/^\s*/, "").replace(/\s*$/, "");
                count = 0;
                expression = "^[^a-z\\d]*?";
                previous = "";
                for (var j = 0, l = part.length; j < l; j++) {
                    if (previous === part[j]) {
                        count++;
                    } else {
                        if (count > 1) {
                            expression += "{" + count.toString() + "}";
                        }
                        if (count > 0) {
                            expression += ")";
                        }
                        switch (part[j]) {
                            case "C":
                            case "A":
                                expression += "(\\d";
                                break;
                            case "N":
                                expression += "([a-z\\d]";
                                break;
                            case " ":
                                expression += "[^a-z\\d]+";
                                break;
                        }
                        count = (part[j] === " ") ? 0 : 1;
                        previous = part[j];
                    }
                }
                if (count > 1) {
                    expression += "{" + count.toString() + "}";
                }
                if (count > 0) {
                    expression += ")";
                }
                expression += "\\s*(?:(extension|extn\\.?|ext\\.?|ex\\.?|x\\.?|#)\\s*([a-z\\d]*))?\\s*$";
                attribute.__regexparray[i] = new RegExp(expression, "i");
            }
        }
    };

    function validatePhoneNumber(modelItem, property, id, value) {
        var validationResult,
            message,
            attribute = msls_getAttribute(modelItem, phoneNumberValidation),
            valid = false;

        if (!!value && !!attribute && !!attribute.formats) {
            if (!attribute.__regexparray) {
                msls_tryGetPhoneNumberFormats(attribute);
            }
            msls_iterate(attribute.__regexparray).each(function (expression) {
                valid = expression.test(value);
                return !valid;
            });
            if (!valid) {
                message = msls_getResourceString("validation_phonenumber_invalidFormat");
                validationResult = new msls_ValidationResult(property, message);
            }
        }

        return validationResult;
    }

    function validateEmailAddress(modelItem, property, id, value) {
        var validationResult,
            message,
            validationAttribute = msls_getAttribute(modelItem, emailAddressValidation),
            propertiesAttribute = msls_getAttribute(modelItem, emailAddressProperties),
            expressions = msls_getEmailAddressExpressions(),
            partExpression = expressions[0],
            fullExpression = expressions[1],
            isValid = true;

        if (!!value && !!validationAttribute) {
            if (!partExpression.test(value)) {
                isValid = false;
            } else if (validationAttribute.domainRequired) {
                isValid = fullExpression.test(value);
            }
        }

        if (!isValid) {
            message = msls_getResourceString("validation_emailaddress_invalidFormat");
            validationResult = new msls_ValidationResult(property, message);
        }

        return validationResult;
    }

    function setAttributeHash(attributeHash, dataType) {
        var attributeName;

        for (attributeName in dataType) {
            if (validators[attributeName]) {
                attributeHash[attributeName] = true;
            }
        }
    }

    validators = {
        ":@MaxLength": validateLength,
        ":@Required": validateRequired,
        ":@Range": validateRange,
        ":@DecimalConstraint": validateDecimalConstraint,
        "Microsoft.LightSwitch.Extensions:@EmailAddressValidation": validateEmailAddress,
        "Microsoft.LightSwitch.Extensions:@PhoneNumberValidation": validatePhoneNumber
    };

    msls_validate =
    function validate(property, value, isOperation) {


        var results = [],
            entityProperty = property,
            entity = !!entityProperty.entity ? entityProperty.entity : null,
            entityState = !!entity ? entity.details.entityState : null,
            validationResult,
            validator,
            attributeName,
            propDef = property.getModel(),
            dataType = propDef.propertyType,
            nullableType,
            attributeHash = {},
            validationRuleDef;

        if (entityState === _EntityState.deleted ||
            entityState === _EntityState.discarded) {
            return results;
        }

        if (isOperation && entityState === _EntityState.unchanged) {
            return results;
        }

        if (property.isReadOnly) {
            return results;
        }

        if (msls_isNullableType(dataType)) {
            nullableType = dataType;
            dataType = nullableType.underlyingType;
        }

        setAttributeHash(attributeHash, propDef);
        if (!!dataType && msls_isSemanticType(dataType)) {
            setAttributeHash(attributeHash, dataType);
        }

        for (attributeName in attributeHash) {
            validationRuleDef = dataType;
            if (propDef[attributeName]) {
                validationRuleDef = propDef;
            }
            validationResult = validators[attributeName](validationRuleDef, property, propDef.propertyType.id, value);
            if (!!validationResult) {
                results.push(validationResult);
            }
        }

        return results;
    };

}());

var msls_DataService_cancelNestedChanges,
    msls_DataService_applyNestedChanges;

(function () {

    var _DataService = msls.DataService,
        _DataServiceDetails = _DataService.Details,
        _EntitySetProperty,
        _EntitySet = msls.EntitySet,
        _DataServiceQuery = msls.DataServiceQuery,
        _EntityState = msls.EntityState,
        _TrackedProperty = msls.Entity.Details.TrackedProperty,
        _StorageProperty = msls.Entity.Details.StorageProperty,
        useJsonLight;

    useJsonLight =
        !!datajs &&
        !!datajs.version &&
        (!!datajs.version.major && datajs.version.major >= 1) &&
        (!!datajs.version.minor && datajs.version.minor >= 1) &&
        (!!datajs.version.build && datajs.version.build >= 1);

    msls_setProperty(msls, "queryable", {

        filter: function filter(expression) {
            var q = new _DataServiceQuery(this);
            msls_setProperty(q, "_filter", expression);
            return q;
        },

        orderBy: function orderBy(propertyName) {
            var q = new _DataServiceQuery(this);
            msls_setProperty(q, "_orderBy", propertyName);
            return q;
        },

        orderByDescending: function orderByDescending(propertyName) {
            var q = new _DataServiceQuery(this);
            msls_setProperty(q, "_orderBy", propertyName + " desc");
            return q;
        },

        thenBy: function thenBy(propertyName) {
            var q = new _DataServiceQuery(this);
            msls_setProperty(q, "_orderBy", propertyName);
            return q;
        },

        thenByDescending: function thenByDescending(propertyName) {
            var q = new _DataServiceQuery(this);
            msls_setProperty(q, "_orderBy", propertyName + " desc");
            return q;
        },

        expand: function expand(expression) {
            var q = new _DataServiceQuery(this);
            msls_setProperty(q, "_expand", expression);
            return q;
        },

        skip: function skip(count) {
            var q = new _DataServiceQuery(this);
            msls_setProperty(q, "_skip", count);
            return q;
        },

        top: function top(count) {
            var q = new _DataServiceQuery(this);
            msls_setProperty(q, "_take", count);
            return q;
        },

        includeTotalCount: function includeTotalCount() {
            var q = new _DataServiceQuery(this);
            msls_setProperty(q, "_includeTotalCount", true);
            return q;
        },

        merge: function merge(mergeOption) {
            var q = new _DataServiceQuery(this);
            msls_setProperty(q, "__mergeOption", mergeOption);
            return q;
        }

    });

    function getQueryExpandsTree(query) {
        var current = query,
            queryExpand,
            currentObject,
            result = {};

        function visitLevel(level) {

            var propertyName = msls_getProgrammaticName(level),
                nextObject = currentObject[propertyName];
            if (!nextObject) {
                nextObject = currentObject[propertyName] = {};
            }
            currentObject = nextObject;
        }

        function visitExpand(expand) {

            currentObject = result;

            expand.split("/").forEach(visitLevel);
        }

        do {
            queryExpand = current._expand;
            if (typeof queryExpand === "string") {
                queryExpand.split(",").forEach(visitExpand);
            }
            current = current._source;
        } while (current);

        return result;
    }

    function fixInclusionInQueryResult(entities, serverResults, queryExpandTree, mergeOption) {
        if (entities.length <= 0 || Object.keys(queryExpandTree).length <= 0) {
            return;
        }

        var firstEntity = entities[0],
            firstDetails = firstEntity.details,
            firstDetailsProperties = firstDetails.properties,
            firstProperty,
            propertyEntry,
            propertyServiceName,
            entitySet,
            newEntities,
            newServerResults,
            i, len = entities.length;

        for (var propertyName in queryExpandTree) {
            if (propertyName in firstDetailsProperties) {
                firstProperty = firstDetailsProperties[propertyName];
                propertyEntry = firstProperty._entry;
                newEntities = [];
                newServerResults = [];

                if (propertyEntry.kind === "reference" || propertyEntry.kind === "collection") {
                    propertyServiceName = propertyEntry.serviceName;
                    entitySet = msls_Entity_getNavigationPropertyTargetEntitySet(firstProperty);

                    for (i = 0; i < len; i++) {
                        msls_loadExpandedEntities(
                            entities[i],
                            propertyEntry,
                            entitySet,
                            serverResults[i][propertyServiceName],
                            mergeOption,
                            newEntities,
                            newServerResults);

                        serverResults[i][propertyServiceName] = null;
                    }

                    fixInclusionInQueryResult(newEntities, newServerResults, queryExpandTree[propertyName], mergeOption);
                }
            }
        }
    }

    function convertDatesToLocal(result) {
        var property, value;
        if (Array.isArray(result)) {
            result.forEach(convertDatesToLocal);
        } else {
            for (property in result) {
                if (property === "__metadata") {
                    continue;
                }
                value = result[property];
                if (value instanceof Date && value.__edmType !== "Edm.DateTimeOffset") {
                    value.setMinutes(value.getMinutes() +
                        value.getTimezoneOffset());
                } else if (typeof (value) === "object") {
                    convertDatesToLocal(value);
                }
            }
        }
    }

    function createServerError(message, property, validationMessage) {
        var result = { message: message };
        if (validationMessage) {
            result.validationResult = new msls_ValidationResult(property, validationMessage);
        }
        return result;
    }

    function tryGetStatusCode(odataResponse) {
        var statusCode = odataResponse &&
                odataResponse.statusCode;
        if (!!statusCode && typeof statusCode !== "number") {
            statusCode = parseInt(statusCode, 10);
        }
        return statusCode;
    }

    function tryGetServerErrors(
        dataJsResponse,
        dataServiceDetails) {
        var
        serverErrors = [],
        errorResponseMessage = dataJsResponse.message,
        response = dataJsResponse.response,
        statusCode,
        exception, nonValidationErrorMessage,
        body, bodyError, bodyXML, jBodyXML, messageNode, rootPrefix, rootPrefixSelector,
        messageValue, messageXML, jMessageXML,
        validationResults, jValidationResult,
        validationResultMessage, validationResultTarget, validationResultProperty,
        entity,
        detailsProperty,
        serverErrorMessage;

        if (!errorResponseMessage) {
            return null;
        }

        statusCode = tryGetStatusCode(response);
        if (!response ||
            (200 <= statusCode && statusCode <= 299)) {
            serverErrors.push(createServerError(errorResponseMessage));
            return serverErrors;
        }

        try {
            body = $.parseJSON(response.body);
            bodyError = body &&
                (body.error || body["odata.error"]);
            messageValue = bodyError &&
                bodyError.message &&
                bodyError.message.value;
        } catch (exception) {
            try {
                bodyXML = $.parseXML(response.body);
                if (bodyXML) {
                    rootPrefix = bodyXML.documentElement &&
                                 bodyXML.documentElement.prefix;
                    rootPrefixSelector = rootPrefix && rootPrefix + "\\:";
                    rootPrefixSelector = rootPrefixSelector || "";
                    jBodyXML = $(bodyXML);
                }
            }
            catch (exception) {
            }
            if (!!jBodyXML) {
                messageNode = jBodyXML.find(rootPrefixSelector + "message");
                if (!messageNode.length) {
                    messageNode = jBodyXML.find("message");
                }
                if (!!messageNode.length) {
                    messageValue = messageNode.text();
                }
            }
        }

        if (messageValue) {
            try {
                messageXML = $.parseXML(messageValue);
                if (messageXML) {
                    jMessageXML = $(messageXML);
                }
            } catch (exception) {
            }
            if (!!jMessageXML) {
                validationResults = jMessageXML.find("ValidationResult");
                if (validationResults.length > 0 && !!dataServiceDetails) {
                    $.each(validationResults, function (i, validationResult) {
                        jValidationResult = $(validationResult);
                        validationResultMessage = jValidationResult.find("Message").text();
                        validationResultTarget = jValidationResult.find("Target").text();
                        validationResultProperty = jValidationResult.find("Property").text();
                        detailsProperty = null;
                        if (validationResultTarget && validationResultProperty) {
                            $.each(dataServiceDetails._entitySets, function (j, entitySet) {
                                entity = entitySet._loadedEntities[validationResultTarget];
                                return !entity;
                            });
                            if (entity) {
                                detailsProperty = entity.details
                                .properties[msls_getProgrammaticName(validationResultProperty)];
                            }
                        }
                        serverErrorMessage = detailsProperty ?
                            detailsProperty.name + ": " + validationResultMessage :
                            validationResultMessage;
                        serverErrors.push(createServerError(
                            serverErrorMessage, detailsProperty, validationResultMessage));
                    });
                } else {
                    if (jMessageXML.find("EntityConflicts").length > 0) {
                        nonValidationErrorMessage = msls_getResourceString("conflict_dialog_message");
                    } else {
                        nonValidationErrorMessage = jMessageXML.find("Message").text() || messageValue;
                    }
                }
            } else {
                nonValidationErrorMessage = messageValue;
            }
        } else {
            nonValidationErrorMessage = msls_getResourceString("dataService_status_error_message",
                response.statusCode, response.statusText);
        }

        if (!!nonValidationErrorMessage || nonValidationErrorMessage === "") {
            serverErrors.push(createServerError(nonValidationErrorMessage));
        }

        return serverErrors;
    }

    function ensureMetadata(dataServiceDetails) {
        var metadataPromise = dataServiceDetails._metadataPromise;

        if (!metadataPromise) {
            metadataPromise = dataServiceDetails._metadataPromise =
            msls_promiseOperation(function initGetMetadata(
                operation) {

                var metadataUrl = dataServiceDetails._serviceUri + "/$metadata";
                OData.read(metadataUrl, operation.code(function (data) {
                    operation.complete(data);
                }), operation.code(function (error) {
                    operation.error(error);
                    dataServiceDetails._metadataPromise = null;
                }), OData.metadataHandler);
            });
        }

        return metadataPromise;
    }

    function executeQuery(query) {
        msls_mark(msls_codeMarkers.queryDataStart);

        var promise = msls_promiseOperation(function initExecuteQuery(operation) {
            var requestUri = query._requestUri,
                entitySet = query._entitySet;

            function reportServerErrors(odataReadError) {
                var serverErrors = tryGetServerErrors(odataReadError),
                    errorMessages = [];
                if (serverErrors) {
                    errorMessages = serverErrors
                        .map(function (
                            serverError) {
                            return serverError.message;
                        });
                }

                operation.error(errorMessages.join("\r\n"));
            }

            function loadData(serviceMetadata) {
                var
                headers = {
                    MinDataServiceVersion: "3.0"
                },
                loadRequest = {
                    requestUri: requestUri,
                    recognizeDates: true,
                    headers: headers
                },
                spHostUrl = msls_getClientParameter("SPHostUrl"),
                spAppWebUrl = msls_getClientParameter("SPAppWebUrl");

                if (serviceMetadata) {
                    headers.accept = "application/json;q=0.8, application/json;odata=fullmetadata;q=0.7, application/atomsvc+xml;q=0.5, */*;q=0.1";
                }

                if (spHostUrl) {
                    headers["X-SPHostUrl"] = spHostUrl;
                }

                if (spAppWebUrl) {
                    headers["X-SPAppWebUrl"] = spAppWebUrl;
                }

                OData.read(
                    loadRequest,
                    operation.code(function success(data) {
                        msls_mark(msls_codeMarkers.queryDataEnd);

                        var results = [],
                            serverResults = data ?
                                ($.isArray(data.results) ? data.results : [data]) :
                                [],
                            mergeOption = query._mergeOption,
                            queryExpandTree,
                            totalCount;

                        convertDatesToLocal(serverResults);

                        $.each(serverResults, function (index, result) {
                            if (entitySet) {
                                result = msls_loadEntity(entitySet, result, mergeOption);
                            }
                            results.push(result);
                        });

                        if (results.length > 0) {
                            queryExpandTree = getQueryExpandsTree(query);
                            fixInclusionInQueryResult(results, serverResults, queryExpandTree, mergeOption);
                        }

                        totalCount = data && data.__count;
                        if (!!totalCount && typeof totalCount === "string") {
                            totalCount = parseInt(totalCount, 10);
                            if (totalCount === Number.NaN) {
                                totalCount = -1;
                            }
                        }

                        operation.complete({
                            totalCount: totalCount,
                            results: results
                        });
                        msls_mark(msls_codeMarkers.queryDataApplyEnd);
                    }),
                    operation.code(function error(err) {
                        msls_mark(msls_codeMarkers.queryDataEnd);

                        var statusCode = tryGetStatusCode(
                                err.response);

                        if (statusCode === 404) {
                            operation.complete({
                                totalCount: 0,
                                results: []
                            });

                        } else {
                            reportServerErrors(err);
                        }
                    }),
                    null,
                    null,
                    serviceMetadata
                );
            }

            if (useJsonLight) {
                ensureMetadata(entitySet.dataService.details).then(
                    function (metadata) {
                        loadData(metadata);
                    },
                    function (metadataError) {
                        reportServerErrors(metadataError);
                    });
            } else {
                loadData();
            }

            operation.interleave();
        });
        return promise;
    }

    msls_mixIntoExistingClass(_DataServiceQuery, msls.queryable);

    msls_DataServiceQuery_isValidSkipTop = function isValidSkipTop(value) {
        return typeof value === "number" && value > 0;
    };

    function getMergeOption(queryableObjectMergeOption) {
        return queryableObjectMergeOption || msls.MergeOption.appendOnly;
    }

    msls_mixIntoExistingClass(_DataServiceQuery, {
        execute: function execute() {
            var me = this,
                current = me,
                afterQueryExecuted;
            do {
                afterQueryExecuted = current._afterQueryExecuted;
                if (msls_isFunction(afterQueryExecuted)) {
                    break;
                }
                current = current._source;
            } while (current);

            if (afterQueryExecuted) {
                return msls_promiseOperation(function initExecute(
                    operation) {
                    executeQuery(me)
                    ._thenEx(function (error, result) {
                        if (error) {
                            operation.error(error);
                        } else {
                            try {
                                afterQueryExecuted(me, result);
                            } catch (ex) {
                                operation.error(ex);
                            }
                            operation.complete(result);
                        }
                    });
                    operation.interleave();
                });
            } else {
                return executeQuery(me);
            }
        },
        _requestUri: msls_accessorProperty(
            function _requestUri_get() {
                var requestUri,
                    current = this, i,
                    filters = [],
                    skip,
                    take,
                    includeTotalCount,
                    orderBys = [],
                    expands = [],
                    options = [];
                do {
                    if (current._rootUri) {
                        requestUri = current._rootUri;
                        break;
                    }
                    if (typeof current._filter === "string") {
                        if (filters.length === 0) {
                            filters.unshift(current._filter);
                        } else {
                            if (filters.length === 1) {
                                filters[0] = "(" + filters[0] + ")";
                            }
                            filters.unshift("(" + current._filter + ")");
                        }
                    }
                    if (typeof current._orderBy === "string") {
                        orderBys.unshift(current._orderBy);
                    }
                    if (typeof current._expand === "string") {
                        expands.push(current._expand.replace(/\./g, "/"));
                    }
                    if (typeof skip !== "number" &&
                        msls_DataServiceQuery_isValidSkipTop(current._skip)) {
                        skip = current._skip;
                    }
                    if (typeof take !== "number" &&
                        msls_DataServiceQuery_isValidSkipTop(current._take)) {
                        take = current._take;
                    }
                    if (typeof includeTotalCount !== "boolean" &&
                        current._includeTotalCount) {
                        includeTotalCount = current._includeTotalCount;
                    }
                    current = current._source;
                } while (current);
                if (current._queryParameters) {
                    $.each(current._queryParameters, function (key, val) {
                        if (val !== "null") {
                            options.push(encodeURIComponent(key.toString()) +
                                "=" + encodeURIComponent(val.toString()));
                        }
                    });
                }
                if (filters.length > 0) {
                    options.push("$filter=" + encodeURIComponent(filters.join(" and ")));
                }
                if (orderBys.length > 0) {
                    orderBys = orderBys.map(function (orderBy) {
                        return encodeURIComponent(orderBy)
                            .replace(/\%20/g, " ").replace(/\%2C/g, ",");
                    });
                    options.push("$orderby=" + orderBys.join(","));
                }
                if (expands.length > 0) {
                    expands = expands.map(function (expand) {
                        return encodeURIComponent(expand)
                            .replace(/\%2C/g, ",").replace(/\%2F/g, "/");
                    });
                    options.push("$expand=" + expands.join(","));
                }
                if (typeof skip === "number") {
                    options.push("$skip=" + skip.toString());
                }
                if (typeof take === "number") {
                    options.push("$top=" + take.toString());
                }
                if (includeTotalCount) {
                    options.push("$inlinecount=allpages");
                }
                if (options.length > 0) {
                    requestUri += "?" + options.join("&");
                }
                return requestUri;
            }
        ),
        _mergeOption: msls_accessorProperty(
            function _mergeOption_get() {
                var result,
                    current = this;
                do {
                    result = current.__mergeOption;
                    if (result) {
                        break;
                    }
                    current = current._source;
                } while (current);
                return getMergeOption(result);
            }
        )
    });

    msls_initDataServiceQuery =
    function initDataServiceQuery(dataServiceQuery, source, rootUri, queryParameters) {
        msls_setProperty(dataServiceQuery, "_source", source);
        msls_setProperty(dataServiceQuery, "_entitySet", source._entitySet);
        msls_setProperty(dataServiceQuery, "_rootUri", rootUri);
        msls_setProperty(dataServiceQuery, "_queryParameters", queryParameters);
    };

    msls_mixIntoExistingClass(_EntitySet, msls.queryable);

    msls_mixIntoExistingClass(_EntitySet, {
        canInsert: msls_accessorProperty(
            function canInsert_get() {
                return !!this._model.canInsert;
            }
        ),
        canUpdate: msls_accessorProperty(
            function canUpdate_get() {
                return !!this._model.canUpdate;
            }
        ),
        canDelete: msls_accessorProperty(
            function canDelete_get() {
                return !!this._model.canDelete;
            }
        ),
        _mergeOption: msls_accessorProperty(
            function _mergeOption_get() {
                return getMergeOption();
            }
        ),
        getModel: function getModel() {
            return this._model;
        },
        getEntityType: function getEntityType() {
            return this._entityType;
        },
        load: function load() {
            return executeQuery(this);
        },
        addNew: function addNew() {
            return new (this.getEntityType())(this);
        }
    });

    msls_initEntitySet =
    function initEntitySet(entitySet, dataService, entry) {
        var dataServiceDetails = dataService.details;
        entitySet.dataService = dataService;
        entitySet.name = entry ? entry.name : null;
        msls_setProperty(entitySet, "_model",
            dataServiceDetails.properties[entry.name].getModel());
        msls_setProperty(entitySet, "_entityType", entry.elementType);
        msls_setProperty(entitySet, "_requestUri",
            dataServiceDetails._serviceUri + "/" +
            encodeURIComponent(entry.serviceName));
        msls_setProperty(entitySet, "_rootUri", entitySet._requestUri);
        msls_setProperty(entitySet, "_entitySet", entitySet);
        msls_setProperty(entitySet, "_addedEntities", []);
        msls_setProperty(entitySet, "_loadedEntities", {});
    };

    function getTimeOffsetString(date) {
        var offset = date.getTimezoneOffset(),
            result;
        if (offset === 0) {
            return "Z";
        }
        if (offset < 0) {
            result = "+";
            offset = -offset;
        } else {
            result = "-";
        }
        return result.concat(formatDateElement(Math.floor(offset / 60)), ":",  formatDateElement(offset % 60));
    }

    function toODataJSONFormat(data, type) {
        if (data === undefined || data === null) {
            return data;
        }

        if (type.charAt(0) !== ":") {
            type = ":" + type;
        }

        switch (type) {
            case ":Binary":
            case ":Binary?":
            case ":Decimal":
            case ":Decimal?":
            case ":Guid":
            case ":Guid?":
            case ":Int64":
            case ":Int64?":
                return data.toString();
            case ":DateTimeOffset":
            case ":DateTimeOffset?":
                data.__edmType = "Edm.DateTimeOffset";
                if (!data.__offset) {
                    data.__offset = getTimeOffsetString(data);
                }
                return data;
            case ":DateTime":
            case ":DateTime?":
            case ":Date":
            case ":Date?":
                data = new Date(data.valueOf());
                data.setMinutes(data.getMinutes() - data.getTimezoneOffset());
                return data;
            default:
                return data;
        }

        return;
    }

    function updateChangeRequest(
        requests, request,
        entityDetails, entityState, entityData) {

        if (entityState === _EntityState.added) {
            request.method = "POST";
            requests.newEntities.push(request);
        } else {
            request.method = "MERGE";
            requests.existingEntities.push(request);
            request.headers.Prefer = "return-content";
        }

        var requestData = request.data = {},
            serviceName,
            referenceEntity,
            referenceEntityDetails,
            referenceEntityState,
            referenceEntityData,
            referenceUri,
            propDef,
            dataType;

        $.each(entityDetails.properties.all(), function (i, property) {
            if (!(property instanceof _TrackedProperty)) {
                return;
            }

            serviceName = property._entry.serviceName;

            if (property instanceof _StorageProperty) {
                if (property.isChanged ||
                    (entityState === _EntityState.added && entityData.hasOwnProperty(serviceName))) {
                    propDef = property.getModel();
                    dataType = msls_getUnderlyingTypes(propDef.propertyType).primitiveType;
                    requestData[serviceName] = toODataJSONFormat(entityData[serviceName], dataType.id);
                }
            } else if (property._entry.kind === "reference") {
                if (entityState === _EntityState.added || property.isChanged) {
                    if (entityState === _EntityState.added) {
                        referenceEntity = msls_Entity_tryGetAddedReferencePropertyValue(
                            entityDetails, property);
                    } else {
                        referenceEntity = property.value;
                    }

                    if (referenceEntity) {
                        referenceEntityDetails = referenceEntity.details;
                        referenceEntityState = referenceEntityDetails.entityState;

                        referenceEntityData = referenceEntityDetails._;
                        if (referenceEntityState === _EntityState.added) {
                            referenceUri = "$" + referenceEntityData.__contentID;
                        } else {
                            referenceUri = referenceEntityData.__metadata.uri;
                        }

                        if (entityState === _EntityState.added &&
                            referenceEntityState === _EntityState.added) {
                            requests.links.push({
                                method: "PUT",
                                requestUri: "$" + entityData.__contentID + "/$links/" + serviceName,
                                data: {
                                    uri: referenceUri
                                }
                            });
                        } else {
                            requestData[serviceName] = {
                                __metadata: {
                                    uri: referenceUri
                                }
                            };
                        }

                    } else {
                        if (entityState === _EntityState.modified) {
                            requests.links.push({
                                method: "DELETE",
                                requestUri: request.requestUri + "/$links/" + serviceName
                            });
                        }
                    }
                }
            }
        });
    }

    function initSaveChanges(dataService, operation) {

        msls_mark(msls_codeMarkers.saveDataStart);

        var dataServiceDetails = dataService.details,
            dataWorkspaceDetails = dataServiceDetails.dataWorkspace.details,
            hasNestedChangeSets,
            changes,
            requestUri = dataService.details._serviceUri + "/$batch",
            requests = {
                newEntities: [],
                existingEntities: [],
                links: []
            },
            serverErrors;

        if ((hasNestedChangeSets = dataWorkspaceDetails._nestedChangeSets.length > 0) ||
            (changes = dataService.details.getChanges()).length === 0) {
            msls_mark(msls_codeMarkers.saveDataEnd);
            if (hasNestedChangeSets) {
                msls_throwInvalidOperationError(msls_getResourceString("dataService_save_with_nested_changes"));
            } else {
                operation.complete();
                return;
            }
        }

        changes.forEach(function (entity, i) {
            entity.details._.__contentID = i.toString();
        });

        changes.forEach(function (entity) {
            var entityDetails = entity.details,
                entityState = entityDetails.entityState,
                entitySet = entityDetails.entitySet,
                entityData = entityDetails._,
                request = { recognizeDates: true },
                headers = request.headers = {},
                metadata,
                etag;

            headers["Content-ID"] = entityData.__contentID;
            headers.DataServiceVersion = "3.0";

            if (entityState === _EntityState.added) {
                request.requestUri = entitySet._requestUri.substr(
                    dataServiceDetails._serviceUri.length + 1);
                updateChangeRequest(requests, request, entityDetails, entityState, entityData);

            } else {
                metadata = entityData.__metadata;
                request.requestUri = metadata.uri.substr(
                    dataServiceDetails._serviceUri.length + 1);
                etag = metadata.etag;
                if (etag) {
                    headers["If-Match"] = etag;
                }
                if (entityState === _EntityState.modified) {
                    updateChangeRequest(requests, request, entityDetails, entityState, entityData);

                } else if (entityState === _EntityState.deleted) {
                    request.method = "DELETE";
                    requests.existingEntities.push(request);
                }
            }
        });

        OData.request(
            {
                requestUri: requestUri,
                method: "POST",
                data: {
                    __batchRequests: [
                        {
                            __changeRequests: [].concat(
                                requests.newEntities,
                                requests.existingEntities,
                                requests.links)
                        }
                    ]
                },
                recognizeDates: true
            },
            operation.code(function success(data) {
                var changeResponses = data.__batchResponses[0].__changeResponses,
                    savedEntityEntries = [],
                    entity,
                    entityDetails,
                    newEntityData;

                if (changeResponses.length === 1) {
                    serverErrors = tryGetServerErrors(
                        changeResponses[0],
                        dataServiceDetails);
                }

                if (!serverErrors) {

                    $.each(changeResponses, function (i, changeResponse) {

                        var changeResponseHeaders = changeResponse.headers,
                            headersContentID = changeResponseHeaders &&
                                changeResponseHeaders["Content-ID"],
                            savedEntityEntry,
                            entityState,
                            entitySet,
                            entityData,
                            changedProperties,
                            originalEntityData,
                            changeResponseETag;

                        if (!headersContentID) {
                            return;
                        }

                        entity = changes[parseInt(headersContentID, 10)];
                        entityDetails = entity.details;
                        entityState = entityDetails.entityState;
                        entitySet = entityDetails.entitySet;
                        entityData = entityDetails._;
                        changedProperties = [];
                        savedEntityEntry = {
                            entity: entity,
                            oldEntityState: entityState,
                            oldHasEdits: entityDetails.hasEdits,
                            newEntityData: changeResponse.data
                        };

                        if (entityState === _EntityState.added) {
                            convertDatesToLocal(changeResponse.data);

                            $.each(entityDetails.properties.all(), function (j, property) {
                                if (property instanceof _StorageProperty) {
                                    if (changeResponse.data[property._entry.serviceName] !== property.value) {
                                        changedProperties.push(property);
                                    }
                                } else {
                                    msls_Entity_resetAddedNavigationPropertyAfterSave(
                                        entityDetails,
                                        property,
                                        changeResponse.data);
                                }
                            });
                            savedEntityEntry.changedProperties = changedProperties;
                            entityDetails._ = changeResponse.data;
                            entityData = entityDetails._;
                            $.each(entitySet._addedEntities, function (j) {
                                if (this === entity) {
                                    entitySet._addedEntities.splice(j, 1);
                                    return false;
                                }
                                return true;
                            });
                            entitySet._loadedEntities[entityData.__metadata.uri] = entity;
                        } else if (entityState === _EntityState.modified) {
                            originalEntityData = entityData.__original;
                            $.each(entityDetails.properties.all(), function (j, property) {
                                var serviceName;
                                if (!(property instanceof _TrackedProperty && property.isChanged)) {
                                    return;
                                }

                                if (property instanceof _StorageProperty) {
                                    serviceName = property._entry.serviceName;
                                    originalEntityData[serviceName] = entityData[serviceName];
                                } else {
                                    msls_Entity_resetModifiedReferencePropertyAfterSave(
                                        entityDetails, property);
                                }
                                changedProperties.push(property);
                            });
                            savedEntityEntry.changedProperties = changedProperties;
                            changeResponseETag = changeResponseHeaders && changeResponseHeaders.ETag;
                            if (changeResponseETag) {
                                originalEntityData.__metadata.etag = changeResponseETag;
                            }
                            entityDetails._ = originalEntityData;
                        } else if (entityState === _EntityState.deleted) {
                            delete entitySet._loadedEntities[entityData.__metadata.uri];
                            entityData.__entityState = _EntityState.discarded;
                        }
                        savedEntityEntries.push(savedEntityEntry);
                    });

                    $.each(dataServiceDetails._linkSets, function (i, linkSet) {
                        linkSet.resetAfterSave();
                    });
                    $.each(dataServiceDetails.dataWorkspace.details._linkSets, function (i, linkSet) {
                        linkSet.resetAfterSave();
                    });

                    $.each(savedEntityEntries, function (i, savedEntry) {
                        entity = savedEntry.entity;
                        entityDetails = entity.details;
                        switch (savedEntry.oldEntityState) {
                            case _EntityState.added:
                                $.each(savedEntry.changedProperties, function () {
                                    this.dispatchChange("value");
                                    entity.dispatchChange(this.name);
                                    dataServiceDetails.dispatchEvent("contentchange", this);
                                });
                                if (savedEntry.oldHasEdits) {
                                    entityDetails.dispatchChange("hasEdits");
                                }
                                entityDetails.dispatchChange("entityState");
                                break;
                            case _EntityState.modified:
                                $.each(savedEntry.changedProperties, function () {
                                    this.dispatchChange("originalValue");
                                    this.dispatchChange("isChanged");
                                    this.dispatchChange("isEdited");
                                });
                                newEntityData = savedEntry.newEntityData;
                                if (newEntityData) {
                                    msls_replaceEntityData(entity, savedEntry.newEntityData);
                                }
                                entityDetails.dispatchChange("hasEdits");
                                entityDetails.dispatchChange("entityState");
                                break;
                            case _EntityState.deleted:
                                entityDetails.dispatchChange("hasEdits");
                                entityDetails.dispatchChange("entityState");
                                dataServiceDetails.dispatchEvent("contentchange", entity);
                                break;
                            default:
                                break;
                        }
                        dataServiceDetails._changeCount--;
                    });

                    dataServiceDetails.dispatchChange("hasChanges");
                }

                msls_mark(msls_codeMarkers.saveDataEnd);

                if (serverErrors) {
                    operation.error(serverErrors);
                } else {
                    operation.complete();
                }
            }),
            operation.code(function error(err) {
                serverErrors = tryGetServerErrors(err, dataServiceDetails);

                msls_mark(msls_codeMarkers.saveDataEnd);

                operation.error(serverErrors);
            }),
            OData.batchHandler
        );
    }

    function saveChanges() {
        var me = this,
            promise,
            initError;
        promise = msls_promiseOperation(function (operation) {
            try {
                initSaveChanges(me, operation);
            } catch (e) {
                initError = e;
                throw e;
            }
        });
        if (initError) {
            throw initError;
        }
        return promise;
    }

    msls_mixIntoExistingClass(_DataService, {
        saveChanges: saveChanges
    });

    msls_initDataService =
    function initDataService(dataService, dataWorkspace) {
        if (dataWorkspace) {
            dataService.details.dataWorkspace = dataWorkspace;
        }
    };

    function getChanges() {
        var changes = [];
        $.each(this.properties.all(), function () {
            var entitySet = this.value;
            changes = changes.concat(entitySet._addedEntities);
            $.each(entitySet._loadedEntities, function () {
                if (this.details.entityState !== _EntityState.unchanged) {
                    changes.push(this);
                }
            });
        });
        return changes;
    }

    function discardChanges() {
        $.each(this.getChanges(), function () {
            this.details.discardChanges();
        });
    }

    function _findModel() {
        var
        dataService = this.dataService,
        model = null,
        modelService = msls.services.modelService,
        applicationDefinition,
        dataServiceDetails,
        dataServiceProperty,
        dataWorkspace,
        dataWorkspaceDetails;

        if (!!dataService && modelService.isLoaded) {
            dataServiceDetails = dataService.details;
            dataWorkspace = dataServiceDetails.dataWorkspace;
            if (dataWorkspace) {
                dataWorkspaceDetails = dataWorkspace.details;
                dataServiceProperty = msls_iterate(dataWorkspaceDetails.properties.all())
                    .first(function (p) {
                        return (p.value === dataService);
                    }
                );
                if (dataServiceProperty) {
                    applicationDefinition = msls_getApplicationDefinition();
                    if (applicationDefinition) {
                        model = msls_findModelItem(applicationDefinition.globalItems, dataServiceProperty.name, function (item) {
                            return msls_isEntityContainer(item);
                        });
                    }
                }
            }
        }
        return model;
    }

    msls_mixIntoExistingClass(_DataServiceDetails, {
        hasChanges: msls_observableProperty(null,
            function hasChanges_get() {
                return this._changeCount > 0;
            }
        ),

        getChanges: getChanges,
        discardChanges: discardChanges,
        _findModel: _findModel,

        contentchange: msls_event(),
        dispatchEvent: msls_dispatchEventOverride(
            function dispatchEvent(type, details, baseDispatchEvent) {

                baseDispatchEvent.call(this, type, details);
                var dataWorkspace = this.dataWorkspace,
                    dataWorkspaceDetails,
                    raiseHasChanges;
                if (dataWorkspace) {
                    dataWorkspaceDetails = dataWorkspace.details;
                    if (type === "contentchange") {
                        dataWorkspaceDetails.dispatchEvent("contentchange", details);
                    } else if (type === msls_changeEventType && details === "hasChanges") {
                        if (this.hasChanges) {
                            raiseHasChanges = ++dataWorkspaceDetails._changeCount === 1;
                        } else {
                            raiseHasChanges = --dataWorkspaceDetails._changeCount === 0;
                        }
                        if (raiseHasChanges) {
                            dataWorkspaceDetails.dispatchChange("hasChanges");
                        }
                    }
                }
            }
        )
    });

    msls_initDataServiceDetails =
    function initDataServiceDetails(dataServiceDetails, owner) {
        dataServiceDetails.dataService = owner;
        msls_setProperty(dataServiceDetails, "_entitySets", {});
        msls_setProperty(dataServiceDetails, "_linkSets", {});
        msls_setProperty(dataServiceDetails, "_changeCount", 0);
    };

    msls_DataService_cancelNestedChanges =
    function cancelNestedChanges(details) {
        $.each(details.getChanges(), function () {
            msls_Entity_cancelNestedChanges(this.details);
        });
    };

    msls_DataService_applyNestedChanges =
    function applyNestedChanges(details) {
        var newChangesCount = 0;
        $.each(details.getChanges(), function () {
            if (msls_Entity_applyNestedChanges(this.details)) {
                newChangesCount++;
            }
        });
        return newChangesCount;
    };

    function getEntitySetPropertyValue() {
        var details = this._details,
            entry = this._entry,
            sets = details._entitySets,
            propertyName = entry.name,
            set = sets[propertyName];
        if (!set) {
            sets[propertyName] = set = new _EntitySet(this.dataService, entry);
        }
        return set;
    }

    msls_defineClass(_DataServiceDetails, "EntitySetProperty",
        function DataService_Details_EntitySetProperty(details, entry) {
            msls_ObjectWithDetails_Details_Property.call(this, details, entry);
            this.dataService = this.owner;
        }, msls_ObjectWithDetails_Details_Property, {
            value: msls_accessorProperty(getEntitySetPropertyValue),
            _findModel:
                function () {
                    return msls_findModelItem(
                        this._details.getModel().entitySets,
                        this._entry.name);
                }
        }
    );
    _EntitySetProperty = _DataServiceDetails.EntitySetProperty;

    function makeDataServiceDetails(dataServiceClass) {
        function DataServiceDetails(owner) {
            _DataServiceDetails.call(this, owner);
        }
        return DataServiceDetails;
    }

    function defineDataService(constructor,
        baseServiceUri, entitySets, operations) {
        var dataServiceClass = constructor,
            details = makeDataServiceDetails(constructor),
            mixInContent = {};

        msls_defineClassWithDetails(null, null,
            constructor, details, _DataService);

        msls_mixIntoExistingClass(details, {
            _serviceUri: baseServiceUri
        });

        if (entitySets) {
            entitySets.forEach(function (entry) {
                var entryName = entry.name;
                entry.serviceName = entryName;
                entry.get = function entitySet_get() {
                    return this.details.properties[entryName].value;
                };
                mixInContent[entryName] = msls_propertyWithDetails(
                    entry, _EntitySet, _EntitySetProperty);
            });
        }
        if (operations) {
            operations.forEach(function (entry) {
                entry.serviceName = entry.name;
                mixInContent[entry.name] = entry;
            });
        }
        msls_mixIntoExistingClass(dataServiceClass, mixInContent);

        return dataServiceClass;
    }

    function parseOffset(timeOffset) {
        var sign,
            offsetSections;
        if (timeOffset) {
            switch (timeOffset.charAt(0)) {
                case "Z":
                    return 0;
                case "+":
                    sign = 1;
                    break;
                case "-":
                    sign = -1;
                    break;
                default:
                    return null;
            }
            offsetSections = timeOffset.substr(1).split(":");
            return sign * (parseInt(offsetSections[0], 10) * 60 + parseInt(offsetSections[1], 10));
        }
        return null;
    }

    function toISO8601String(date) {
        var dateTimeOffset = date,
            presetOffset,
            convertedDate;
        if (!!dateTimeOffset.__offset && (presetOffset = parseOffset(dateTimeOffset.__offset)) !== null) {
            convertedDate = new Date(date.valueOf());
            convertedDate.setUTCMinutes(convertedDate.getMinutes() + presetOffset);
            return convertedDate.getUTCFullYear().toString() + "-" +
                formatDateElement(convertedDate.getUTCMonth() + 1) + "-" +
                formatDateElement(convertedDate.getUTCDate()) + "T" +
                formatDateElement(convertedDate.getUTCHours()) + ":" +
                formatDateElement(convertedDate.getUTCMinutes()) + ":" +
                formatSeconds(convertedDate.getUTCSeconds(), convertedDate.getUTCMilliseconds(), dateTimeOffset.__ns) +
                dateTimeOffset.__offset;
        } else {
            return date.getFullYear().toString() + "-" +
                formatDateElement(date.getMonth() + 1) + "-" +
                formatDateElement(date.getDate()) + "T" +
                formatDateElement(date.getHours()) + ":" +
                formatDateElement(date.getMinutes()) + ":" +
                formatSeconds(date.getSeconds(), date.getMilliseconds(), dateTimeOffset.__ns) +
                getTimeOffsetString(date);
        }
    }

    msls_toODataString =
    function toODataString(parameter, dataType) {
        if (parameter === undefined || parameter === null) {
            return "null";
        }

        if (dataType.charAt(0) !== ":") {
            dataType = ":" + dataType;
        }

        switch (dataType) {
            case ":Binary":
            case ":Binary?":
                return "binary'" + parameter + "'";
            case ":Date":
            case ":DateTime":
            case ":Date?":
            case ":DateTime?":
                var d = parameter;
                return "datetime'" +
                    d.getFullYear().toString() + "-" +
                    formatDateElement(d.getMonth() + 1) + "-" +
                    formatDateElement(d.getDate()) + "T" +
                    formatDateElement(d.getHours()) + ":" +
                    formatDateElement(d.getMinutes()) + ":" +
                    formatSeconds(d.getSeconds(), d.getMilliseconds(), d.__ns || 0) + "'";
            case ":DateTimeOffset":
            case ":DateTimeOffset?":
                var df = parameter;
                return "datetimeoffset'" + toISO8601String(df) + "'";
            case ":Decimal":
            case ":Decimal?":
                return parameter + "M";
            case ":Guid":
            case ":Guid?":
                return "guid'" + parameter + "'";
            case ":Int64":
            case ":Int64?":
                return parameter + "L";
            case ":Single":
            case ":Single?":
                return parameter + "f";
            case ":String":
            case ":String?":
                return "'" + parameter.replace(/'/g, "''") + "'";
            case ":TimeSpan":
            case ":TimeSpan?":
                var t = parameter,
                    sign = "",
                    ms,
                    days,
                    hours,
                    minutes,
                    seconds;
                ms = t.ms;
                if (ms < 0) {
                    sign = "-";
                    ms = -ms;
                }
                days = Math.floor(ms / 86400000);
                ms -= 86400000 * days;
                hours = Math.floor(ms / 3600000);
                ms -= 3600000 * hours;
                minutes = Math.floor(ms / 60000);
                ms -= 60000 * minutes;
                seconds = Math.floor(ms / 1000);
                ms -= seconds * 1000;
                return "time'" + sign + "P" + ((days > 0) ? days.toString() + "D" : "") +
                                 "T" + hours.toString() + "H" + minutes.toString() + "M" +
                                 ((ms > 0) ? (seconds + ms / 1000).toString() : seconds.toString()) + "S'";
            case ":Byte":
            case ":Byte?":
            case ":Boolean":
            case ":Boolean?":
            case ":Double":
            case ":Double?":
            case ":Int16":
            case ":Int16?":
            case ":Int32":
            case ":Int32?":
            case ":SByte":
            case ":SByte?":
                return parameter.toString();
            default:
                return;
        }

        return;
    };

    function formatDateElement(value) {
        if (value < 10) {
            return "0" + value.toString();
        } else {
            return value.toString();
        }
    }

    function formatSeconds(seconds, milliseconds, ns) {
        var value;
        if (!milliseconds && !ns) {
            return formatDateElement(seconds);
        } else {
            if (!ns) {
                ns = 0;
            }
            value = (1000 + milliseconds) * 10000 + ns;
            return formatDateElement(seconds) + "." + value.toString().substr(1);
        }
    }

    msls_expose("DataService", _DataService);
    msls_expose("_toODataString", msls_toODataString);
    msls_expose("EntitySet", _EntitySet);
    msls_expose("DataServiceQuery", _DataServiceQuery);
    msls_expose("_defineDataService", defineDataService);

    function getEntitySetInformationForEntityType(dataWorkspace, entityType) {

        var entitySet,
            result;

        msls_iterate(dataWorkspace.details.properties.all())
        .each(function (dataServiceProperty) {

            msls_iterate(dataServiceProperty.value.details.properties.all())
            .each(function (entitySetProperty) {
                entitySet = entitySetProperty.value;
                if (entitySet.getEntityType() === entityType) {
                    result = {
                        entitySet: entitySet,
                        model: entitySetProperty.getModel()
                    };
                    return false;
                }
                return true;
            });

            return !result;
        });

        return result;
    }

    msls_EntitySet_getEntitySetForEntityType =
    function getEntitySetForEntityType(dataWorkspace, entityType) {
        var entitySetInfo = getEntitySetInformationForEntityType(
                dataWorkspace, entityType);

        return entitySetInfo ? entitySetInfo.entitySet : null;
    };

    msls_EntitySet_isEntitySetReadOnly =
    function isEntitySetReadOnly(dataWorkspace, entityType) {
        var entitySetInfo = getEntitySetInformationForEntityType(
                dataWorkspace, entityType),
            entitySetModel = entitySetInfo.model;

        return !(entitySetModel.canDelete ||
                entitySetModel.canInsert ||
                entitySetModel.canUpdate);
    };
}());

(function () {

    var _DataWorkspace = msls.DataWorkspace,
        _DataWorkspaceDetails = _DataWorkspace.Details,
        _DataServiceProperty;

    function hasNestedChanges_get() {
        return this._changeCount > 0;
    }

    function isLastNestedChangeSet(nestedChangeSet) {
        var nestedChangeSets = nestedChangeSet._owner._nestedChangeSets;
        if (nestedChangeSets.length <= 0) {
            return false;
        }
        return nestedChangeSet === nestedChangeSets[nestedChangeSets.length - 1];
    }

    function updateChangeCount(nestedChangeSet, amount) {
        var previousHasChanges = nestedChangeSet.hasNestedChanges;
        nestedChangeSet._changeCount += amount;
        if (previousHasChanges !== nestedChangeSet.hasNestedChanges) {
            nestedChangeSet.dispatchChange("hasNestedChanges");
        }
    }

    function updateChangeCounts(nestedChangeSet, parentChangeSet, newChangesCount) {

        updateChangeCount(nestedChangeSet, -nestedChangeSet._changeCount);

        if (parentChangeSet) {
            updateChangeCount(parentChangeSet, newChangesCount);
        }
    }

    function closeChanges(nestedChangeSet, newChangesCount) {

        var dataWorkspaceDetails = nestedChangeSet._owner,
            nestedChangeSets = dataWorkspaceDetails._nestedChangeSets,
            parentChangeSet;

        nestedChangeSets.pop();

        if (nestedChangeSets.length > 0) {
            parentChangeSet =
                nestedChangeSets[nestedChangeSets.length - 1];
        }

        updateChangeCounts(nestedChangeSet, parentChangeSet, newChangesCount);

        if (nestedChangeSets.length === 0) {
            dataWorkspaceDetails.dispatchChange("hasNestedChangeSets");
        }
    }

    function applyNestedChangesCore(nestedChangeSet) {
        var newChangesCount = 0;
        $.each(nestedChangeSet._owner._dataServices, function (serviceName, service) {
            newChangesCount += msls_DataService_applyNestedChanges(service.details);
        });
        return newChangesCount;
    }

    function getNestedChanges() {
        var allChanges = this._owner.getChanges(),
            changeSetIndex = this._owner._nestedChangeSets.indexOf(this),
            nestedChanges = [];
        $.each(allChanges, function () {
            var entityData = this.details._;
            while (entityData) {
                if (entityData.__changeSetIndex === changeSetIndex) {
                    nestedChanges.push(this);
                    break;
                }
                entityData = entityData.__parent;
            }
        });
        return nestedChanges;
    }

    function throwIfNotLast(nestedChangeSet) {
        if (!isLastNestedChangeSet(nestedChangeSet)) {
            msls_throwInvalidOperationError(msls_getResourceString(
                "nestedChangeSet_not_last"));
        }
    }

    function applyNestedChanges() {
        throwIfNotLast(this);
        var newChangesCount = applyNestedChangesCore(this),
            dataWorkspaceDetails = this._owner,
            nestedChangeSets = dataWorkspaceDetails._nestedChangeSets,
            parentChangeSet;
        if (nestedChangeSets.length > 1) {
            parentChangeSet = nestedChangeSets[nestedChangeSets.length - 2];
        }
        updateChangeCounts(this, parentChangeSet, newChangesCount);
    }

    function commitNestedChanges() {
        throwIfNotLast(this);
        closeChanges(this, applyNestedChangesCore(this));
    }

    function cancelNestedChanges() {
        throwIfNotLast(this);
        $.each(this._owner._dataServices, function (serviceName, service) {
            msls_DataService_cancelNestedChanges(service.details);
        });
        closeChanges(this, 0);
    }

    msls_defineClass(_DataWorkspace, "NestedChangeSet",
        function DataWorkspace_NestedChangeSet(owner) {
            msls_setProperty(this, "_owner", owner);
        }, null, {
            _changeCount: 0,

            hasNestedChanges: msls_observableProperty(null, hasNestedChanges_get),

            getNestedChanges: getNestedChanges,
            applyNestedChanges: applyNestedChanges,
            commitNestedChanges: commitNestedChanges,
            cancelNestedChanges: cancelNestedChanges
        }
    );

    msls_initDataWorkspace =
    function initDataWorkspace(dataWorkspace) {
    };

    function hasChanges_get() {
        return this._changeCount > 0;
    }

    function hasNestedChangeSets_get() {
        return this._nestedChangeSets.length > 0;
    }

    function getChanges() {
        var changes = [];
        $.each(this._dataServices, function () {
            changes = changes.concat(this.details.getChanges());
        });
        return changes;
    }

    msls_DataWorkspace_beginNestedChanges =
    function beginNestedChanges(dataWorkspace) {
        var details = dataWorkspace.details,
            nestedChangeSets = details._nestedChangeSets,
            nestedChangeSet = new msls.DataWorkspace.NestedChangeSet(details);
        nestedChangeSets.push(nestedChangeSet);
        if (nestedChangeSets.length === 1) {
            details.dispatchChange("hasNestedChangeSets");
        }
        return nestedChangeSet;
    };

    function _findModel() {
        return msls_findModelItem(
            msls_getApplicationDefinition().globalItems,
            "DataWorkspace");
    }

    msls_mixIntoExistingClass(_DataWorkspaceDetails, {
        hasChanges: msls_observableProperty(null, hasChanges_get),
        hasNestedChangeSets: msls_observableProperty(null, hasNestedChangeSets_get),

        getChanges: getChanges,
        _findModel: _findModel,

        contentchange: msls_event()
    });

    msls_initDataWorkspaceDetails =
    function initDataWorkspaceDetails(dataWorkspaceDetails, owner) {
        dataWorkspaceDetails.dataWorkspace = owner;
        msls_setProperty(dataWorkspaceDetails, "_dataServices", {});
        msls_setProperty(dataWorkspaceDetails, "_linkSets", {});
        msls_setProperty(dataWorkspaceDetails, "_nestedChangeSets", []);
        msls_setProperty(dataWorkspaceDetails, "_changeCount", 0);
    };

    msls_DataWorkspace_updateNestedChangeCount =
    function updateNestedChangeCount(details, nestedChangeSetIndex, amount) {
        var nestedChangeSets = details._nestedChangeSets;
        if (0 <= nestedChangeSetIndex && nestedChangeSetIndex < nestedChangeSets.length) {
            updateChangeCount(
                nestedChangeSets[nestedChangeSetIndex],
                amount);
        }
    };

    function getDataServicePropertyValue() {
        var details = this._details,
            entry = this._entry,
            services = details._dataServices,
            propertyName = entry.name,
            service = services[propertyName];
        if (!service) {
            services[propertyName] = service = new entry.type(details.dataWorkspace);
        }
        return service;
    }

    msls_defineClass(_DataWorkspaceDetails, "DataServiceProperty",
        function DataWorkspace_Details_DataServiceProperty(details, entry) {
            msls_ObjectWithDetails_Details_Property.call(this, details, entry);
            this.dataWorkspace = this.owner;
        }, msls_ObjectWithDetails_Details_Property, {
            value: msls_accessorProperty(getDataServicePropertyValue),
            _findModel:
                function () {
                    return msls_findModelItem(
                        this._details.getModel().members,
                        this._entry.name);
                }
        }
    );
    _DataServiceProperty = _DataWorkspaceDetails.DataServiceProperty;

    function makeDataWorkspaceDetails(dataWorkspaceClass) {
        function DataWorkspaceDetails(owner) {
            _DataWorkspaceDetails.call(this, owner);
        }
        return DataWorkspaceDetails;
    }

    function defineDataWorkspace(constructor, dataServices) {
        var dataWorkspaceClass = constructor,
            details = makeDataWorkspaceDetails(constructor),
            mixInContent = {};
        msls_defineClassWithDetails(null, null,
            constructor, details, _DataWorkspace);
        if (dataServices) {
            dataServices.forEach(function (entry) {
                var entryName = entry.name;
                entry.serviceName = entryName;
                entry.get = function () {
                    return this.details.properties[entryName].value;
                };
                mixInContent[entryName] = msls_propertyWithDetails(
                    entry, entry.type, _DataServiceProperty);
            });
            msls_mixIntoExistingClass(dataWorkspaceClass, mixInContent);
        }
        return dataWorkspaceClass;
    }

    msls_expose("DataWorkspace", _DataWorkspace);
    msls_expose("_defineDataWorkspace", defineDataWorkspace);

}());

var msls_CollectionLoader;

(function () {

    function subscribe(collectionChangeCallback, invalidatedCallback) {

        msls_setProperty(this, "_collectionChangeCallback", collectionChangeCallback);
        msls_setProperty(this, "_invalidatedCallback", invalidatedCallback);
    }

    function loadNext(mergeOption, currentItems) {
        throw undefined;
    }

    function reset() {
        throw undefined;
    }

    function addNewItem() {
        throw undefined;
    }

    function deleteItem(item) {
        throw undefined;
    }

    msls_defineClass(msls, "CollectionLoader",
        function CollectionLoader(pageSize) {

            if (!pageSize) {
                pageSize = 45;
            }
            msls_setProperty(this, "_pageSize", pageSize);
        },
        null, {
            canLoadNext: false,
            subscribe: subscribe,
            loadNext: loadNext,
            reset: reset,
            addNewItem: addNewItem,
            deleteItem: deleteItem
        }
    );
    msls_CollectionLoader = msls.CollectionLoader;

}());

var msls_data_DataBindingMode,
    msls_data_isDataBinding = 0;

(function () {

    msls_defineEnum("data", {
        DataBindingMode: {
            twoWay: 1,
            oneWayFromSource: 2,
            oneWayFromTarget: 3,
            once: 4
        }
    });

    msls_data_DataBindingMode = msls.data.DataBindingMode;

    function DataBinding(bindingPath, bindingSource, targetProperty, bindingTarget, bindingMode) {


        this.bindingPath = bindingPath;
        this.bindingSource = bindingSource;
        this.targetProperty = targetProperty;
        this.bindingTarget = bindingTarget;
        this.bindingMode = bindingMode ? bindingMode : msls_data_DataBindingMode.twoWay;
        this._resetting = false;
        this._lastSourceNode = null;
        this._lastSourceProperty = null;
        this._callbacks = [];

        if ($.isFunction(bindingTarget) &&
            (this.bindingMode === msls_data_DataBindingMode.twoWay || this.bindingMode === msls_data_DataBindingMode.oneWayFromTarget)) {
            throw "Binding initialization error. Invalid binding mode.";
        }
    }

    function CallbackObject(host, propertyName, callback) {
        this.host = host;
        this.propertyName = propertyName;
        this.callback = callback;
    }


    function bind() {
        var me = this,
            target = me.bindingTarget;

        _reset(me, false);

        if (!msls_isDependentObject(me)) {
            if (target && !$.isFunction(target)) {
                msls_addLifetimeDependency(target, me);
            } else {
                msls_addLifetimeDependency(me.bindingSource, me);
            }
        }
    }

    function activate() {
        if (this._isDeactivated) {
            this._isDeactivated = false;

            if (this._invalidated) {
                _reset(this, false);
                this._invalidated = false;
            }
        }
    }

    function deactivate() {

        this._isDeactivated = true;
    }

    function _onDispose() {
        this.bindingSource = null;
        _reset(this, true);

        this.bindingTarget = null;
        this.value = null;
    }

    function _reset(me, calledFromDispose) {

        var paths = me.bindingPath ? me.bindingPath.split(".") : [],
            curNode = me.bindingSource,
            registeredCallbacks = me._callbacks,
            i, callback, targetCallback,
            self_targetCallback = me._targetCallback,
            self_bindingTarget = me.bindingTarget,
            value;

        if (me._resetting) {
            return;
        }

        function updateValue() {
            if (!!me._isDeactivated) {
                me._invalidated = true;
            } else {
                value = _convertValue(me, me._lastSourceNode[me._lastSourceProperty]);
                compareAndSetValue(me, self_bindingTarget, me.targetProperty, value);
            }
        }

        function resetValue() {
            if (!!me._isDeactivated) {
                me._invalidated = true;
            } else {
                _reset(me, false);
            }
        }

        try {
            msls_data_isDataBinding++;
            me._resetting = true;

            for (i = 0; i < registeredCallbacks.length; i++) {
                callback = registeredCallbacks[i];
                callback.host.removeChangeListener(callback.propertyName, callback.callback);
            }

            registeredCallbacks = [];

            if (!calledFromDispose) {
                for (i = 0; i < paths.length; i++) {
                    var path = paths[i];

                    if (curNode && supportsNotifyPropertyChanged(curNode) &&
                         (me.bindingMode === msls_data_DataBindingMode.twoWay ||
                          me.bindingMode === msls_data_DataBindingMode.oneWayFromSource)) {

                        if (i === paths.length - 1) {
                            callback = updateValue;
                        } else {
                            callback = resetValue;
                        }

                        curNode.addChangeListener(path, callback);
                        registeredCallbacks.push(new CallbackObject(curNode, path, callback));
                    }

                    me._lastSourceNode = curNode;
                    me._lastSourceProperty = path;

                    if (!curNode) {
                        break;
                    }

                    curNode = curNode[path];
                    if (!curNode && i < paths.length - 1) {
                        me._lastSourceNode = null;
                        break;
                    }
                }
                value = _convertValue(me, curNode);
                compareAndSetValue(me, self_bindingTarget, me.targetProperty, value);
            } else {
                me._lastSourceNode = null;
                me._lastSourceProperty = null;
                me.value = null;
            }

            if (self_targetCallback) {
                self_targetCallback.host.removeChangeListener(self_targetCallback.propertyName, self_targetCallback.callback);
            }

            self_targetCallback = null;

            if (!calledFromDispose) {
                if (!!self_bindingTarget && supportsNotifyPropertyChanged(self_bindingTarget) &&
                     (me.bindingMode === msls_data_DataBindingMode.twoWay ||
                      me.bindingMode === msls_data_DataBindingMode.oneWayFromTarget)) {

                    targetCallback = function () {
                        if (me._isDeactivated) {
                            me._invalidated = true;
                        } else {
                            _updateSource(me);
                        }
                    };

                    self_bindingTarget.addChangeListener(me.targetProperty, targetCallback);
                    self_targetCallback = new CallbackObject(self_bindingTarget, me.targetProperty, targetCallback);
                }
            }
        } finally {
            me._resetting = false;
            msls_data_isDataBinding--;
            me._callbacks = registeredCallbacks;
            me._targetCallback = self_targetCallback;
        }
    }

    function _updateSource(me) {

        var lastSourceProperty = me._lastSourceProperty;

        if (me._resetting) {
            return;
        }

        me._resetting = true;
        var value = _convertBackValue(me, me.bindingTarget[me.targetProperty]);

        compareAndSetValue(me, me._lastSourceNode, me._lastSourceProperty, value);
        me._resetting = false;
    }

    function _convertValue(me, value) {

        var converter = me.converter;

        if (!converter || !$.isFunction(converter.convert)) {
            return value;
        }
        return converter.convert(value);
    }

    function _convertBackValue(me, value) {

        var converter = me.converter;

        if (!converter || !$.isFunction(converter.convertBack)) {
            return value;
        }
        return converter.convertBack(value);
    }

    function supportsNotifyPropertyChanged(object) {
        return object.addChangeListener && object.removeChangeListener;
    }

    function compareAndSetValue(me, object, propertyName, newValue) {

        if (!msls_isSameValue(me.value, newValue) || !me._isTargetInitialized) {
            me.value = newValue;
            if ($.isFunction(object)) {
                object.call(me, newValue);
            } else if (!!object && !!propertyName && object[propertyName] !== newValue) {
                object[propertyName] = newValue;
            }
            me._isTargetInitialized = true;
        }
    }

    msls_defineClass("data", "DataBinding", DataBinding, null, {
        value: null,

        bind: bind,
        activate: activate,
        deactivate: deactivate,

        _onDispose: _onDispose
    });

}());

var msls_createBoundArguments;

(function () {

    function createBoundArgumentsClass(count) {
        return msls_defineClass(null, null,
                function BoundArguments() {
                },
                msls.BoundArguments,
                { length: count }
            );
    }

    msls_createBoundArguments =
    function createBoundArguments(context, args) {
        var _Class = createBoundArgumentsClass(args.length),
            result = new _Class(),
            mixInContent = {},
            dataBinding,
            dataBindings = [];

        $.each(args, function (index) {
            var argumentName = "arg" + index.toString(),
                optional = this.optional,
                binding = this.binding,
                value = this.value;
            if (binding) {
                mixInContent[argumentName] = msls_observableProperty(value);

                dataBinding = new msls.data.DataBinding(binding, context, argumentName, result);
                dataBindings.push(dataBinding);


            } else {
                mixInContent[argumentName] = msls_dataProperty(value);
            }
            if (optional) {
                mixInContent[argumentName + ".optional"] = true;
            }
        });
        msls_mixIntoExistingClass(_Class, mixInContent);
        dataBindings.forEach(function (binding) {
            binding.bind();
        });
        return result;
    };

    function getCurrentValues() {
        var result = [];
        for (var i = 0, len = this.length; i < len; i++) {
            result.push(this["arg" + i.toString()]);
        }
        return result;
    }

    msls_defineClass(msls, "BoundArguments",
        function BoundArguments() {
        },
        null, {

            getCurrentValues: getCurrentValues
        }
    );
    msls_makeObservable(msls.BoundArguments);

}());

(function () {




    function TextFormatConverter() {
    }

    function textFormatConverter_convert(value) {
        var re = /\{(.*)\}/,
            variable,
            match = re.exec(this.format),
            result = this.format,
            evaluatedValue;

        while (!!match) {
            variable = match[1];
            evaluatedValue = (variable === "value") ? value : (this[variable] ? this[variable] : "");

            result = result.replace("{" + variable + "}", evaluatedValue);
            match = re.exec(result);
        }
        return result;
    }

    function textFormatConverter_convertBack(value) {
        return value;
    }

    msls_defineClass("ui.converters", "TextFormatConverter", TextFormatConverter, null, {
        convert: textFormatConverter_convert,
        convertBack: textFormatConverter_convertBack
    });

    function GenericConverter(convert, convertBack) {

        msls_throwIfFalsy(convert, "convert");

        this._convert = convert;
        this._convertBack = convertBack;
    }

    function genericConverter_convert(value) {
        return this._convert.call(this, value);
    }

    function genericConverter_convertBack(value) {
        if (this._convertBack) {
            return this._convertBack.call(this, value);
        }
        return value;
    }

    msls_defineClass("ui.converters", "GenericConverter", GenericConverter, null, {
        convert: genericConverter_convert,
        convertBack: genericConverter_convertBack
    }
    );

}());

var msls_makeDataServiceQueryLoader;

(function () {

    function executeQuery(loader) {
        var activeQuery = loader._activeQuery,
            executeQueryFunction =
                activeQuery.execute || activeQuery.load;
        return executeQueryFunction.call(activeQuery);
    }

    function getEntityUri(entity) {
        var entityData,
            entityMetadata;
        return entity &&
            (entityData = entity.details._) &&
            (entityMetadata = entityData.__metadata) &&
            entityMetadata.uri;
    }

    function removeDuplicates(me, currentItems, newItems) {
        var items = newItems,
            currentItemsHash = {};

        if (!currentItems || currentItems.length <= 0 ||
            !newItems || newItems.length <= 0) {
            return items;
        }

        items = [];

        currentItems.forEach(function (currentEntity) {
            var currentEntityUri = getEntityUri(currentEntity);
            if (currentEntityUri) {
                currentItemsHash[currentEntityUri] = true;
            }
        });

        newItems.forEach(function (newEntity) {
            var newEntityUri = getEntityUri(newEntity);
            if (!newEntityUri || !currentItemsHash[newEntityUri]) {
                items.push(newEntity);
            }
        });

        return items;
    }

    function loadNext(mergeOption, currentItems) {

        var me = this,
            activePromise = me._activePromise,
            loadNextOperationDone;

        if (!activePromise) {
            activePromise = me._activePromise =
            msls_promiseOperation(function initLoadNext(operation) {
                activePromise = me._activePromise = operation.promise();

                var query = me._baseQuery,
                    skipCount = me._skipCount,
                    takeCount;

                function onQueryExecuted(
                    loadNextCurrentItems, error, result, loadNextOperation) {


                    loadNextOperationDone = true;
                    me._activePromise = null;
                    me._activeQuery = null;

                    if (error) {
                        loadNextOperation.error(error);

                    } else {
                        var results = result.results,
                            resultsLength = results.length,
                            newItems,
                            addedItems;

                        if (me._isFirstPage) {
                            newItems = results;

                            addedItems = me._getAddedEntities();
                            if (!!addedItems && addedItems.length > 0) {
                                newItems = addedItems.slice(0).reverse()
                                    .concat(newItems);
                            }

                            me._skipCount = resultsLength;
                            if (me._disablePaging || resultsLength < me._pageSize) {
                                me._serverCount = resultsLength;
                            } else {
                                me._serverCount = Number.MAX_VALUE;
                            }
                            me._isFirstPage = false;
                        } else {
                            newItems = removeDuplicates(me, loadNextCurrentItems, results);

                            me._skipCount += resultsLength;

                            if (results.length < me._pageSize) {
                                me._serverCount = me._skipCount;
                            }
                        }

                        loadNextOperation.complete(newItems);
                    }
                }

                if (me.canLoadNext && !!query) {
                    takeCount = me._pageSize;
                    if (!me._disablePaging) {
                        query = query.skip(skipCount).top(takeCount);
                    }
                    if (mergeOption) {
                        query = query.merge(mergeOption);
                    }
                    me._activeQuery = query;

                    executeQuery(me)._thenEx(function (error, result) {
                        if (me._activeQuery !== query) {
                            operation.complete();
                        } else {
                            onQueryExecuted(currentItems, error, result, operation);
                        }
                    });

                    operation.interleave();

                } else {
                    onQueryExecuted(
                        currentItems, null, { totalCount: 0, results: [] }, operation);
                }
            });

            if (loadNextOperationDone) {
                me._activePromise = null;
            }
        }

        return activePromise;
    }

    function reset() {
        this._activePromise = null;
        this._activeQuery = null;
        this._isFirstPage = true;
        this._skipCount = 0;
    }

    msls_makeDataServiceQueryLoader =
    function makeDataServiceQueryLoader(loaderType) {
        msls_mixIntoExistingClass(loaderType, {
            _isFirstPage: true,
            _serverCount: 0,
            _skipCount: 0,
            canLoadNext: msls_accessorProperty(
                function canLoadNext_get() {
                    var me = this;
                    return me._isFirstPage ||
                        (!!me._baseQuery && me._skipCount < me._serverCount);
                }
            ),
            loadNext: loadNext,
            reset: reset
        });
    };

}());

var msls_parseConstantExpression,
    msls_parseContentItemRelativeExpression,
    msls_parseScreenRelativeExpression,
    msls_combineBindingPaths;

(function () {

    var defaultValueBindingPath = "";

    msls_defineClass(msls, "ExpressionInfo",
        function ExpressionInfo() {
        },
        null,
        {
            isConstant: false,
            isBinding: false,
            detailsBindingPath: null,
            valueBindingPath: defaultValueBindingPath,
        }
    );

    function parseContentItemRelativeExpression(expression) {
        return _parseExpression(expression, _determineContextForContentItemRelativeExpression);
    }
    msls_parseContentItemRelativeExpression = parseContentItemRelativeExpression;

    function parseScreenRelativeExpression(expression) {
        return _parseExpression(expression, _determineContextForScreenRelativeExpression);
    }
    msls_parseScreenRelativeExpression = parseScreenRelativeExpression;

    msls_parseConstantExpression =
    function parseConstantExpression(expression) {

        var info = _parseExpression(expression, _determineContextForConstantExpression);
        return info.constantValue;
    };

    function _parseExpression(expression, determineContext) {
        var info = new msls.ExpressionInfo();

        if (msls_isChainExpression(expression)) {
            var chain = expression;
            return _parseChainOfExpressions(chain.links || [], determineContext);
        }

        return _parseChainOfExpressions([expression], determineContext);
    }

    function _parseChainOfExpressions(links, determineContext) {

        var info = new msls.ExpressionInfo();

        if (links.length === 1 && msls_isConstantExpression(links[0])) {
            info.constantValue = links[0].value;
            info.isConstant = true;
            return info;
        }

        info.valueBindingPath = determineContext(links);

        if (links.length === 0) {
            info.isBinding = true;
            return info;
        }

        for (var iLink = 0; iLink < links.length; iLink++) {
            var link = links[iLink],
                modelItem,
                memberName,
                isMemberExpression = msls_isMemberExpression(link),
                isCallExpression = msls_isCallExpression(link),
                isLastLink = (iLink === links.length - 1);

            if (isMemberExpression) {
                modelItem = link.member;
                if (typeof link.member === "string") {
                    memberName = link.member;
                    modelItem = null;
                } else {
                    memberName = modelItem.name;
                }
            } else if (isCallExpression) {
                modelItem = link.target;
                memberName = modelItem.name;
                if (info.valueBindingPath === "screen" &&
                    memberName === "showDialog") {
                    memberName = "showPopup";
                }
            } else {
                return info;
            }

            var programmaticName = msls_getProgrammaticName(memberName);

            var parentValuePath = info.valueBindingPath;
            info.valueBindingPath = combineBindingPaths(parentValuePath, programmaticName);

            if (isLastLink) {
                info.lastModelItem = modelItem;
                info.lastObjectBindingPath = parentValuePath;

                if (isMemberExpression) {
                    var newDetailsPath = combineBindingPaths(parentValuePath, "details", "properties", programmaticName);
                    info.detailsBindingPath = newDetailsPath;
                } else {

                    var associatedCollectionAttribute = msls_getAttribute(link, ":@AssociatedCollection");
                    if (associatedCollectionAttribute) {
                        info.associatedCollection = associatedCollectionAttribute.collection;
                    }
                    info.createNewEntities = msls_getAttributes(
                        link, ":@CreateNewEntity") || [];

                    info.argumentBindings = [];
                    info.isCall = true;
                    var parameters = link.target.parameters,
                        source = link.target.source,
                        member, memberParameters,
                        call = link,
                        args = call.arguments || [];

                    while (source) {
                        if (!!(member = source.member)) {
                            if (!!(memberParameters = member.parameters)) {
                                parameters = memberParameters.concat(parameters || []);
                            }
                            source = member.source;
                        } else {
                            break;
                        }
                    }

                    if (parameters) {
                        var argumentBindings = info.argumentBindings;
                        for (var iArgument = 0; iArgument < args.length; iArgument++) {
                            var argExpression = args[iArgument];

                            var index = parameters.indexOf(argExpression.parameter);
                            if (index < 0 || !argExpression.value) {
                                argumentBindings[index] = null;
                            } else {
                                var valueExpression = argExpression.value;
                                var valueInfo = _parseExpression(valueExpression, determineContext);
                                if (valueInfo.isConstant) {
                                    argumentBindings[index] = { value: valueInfo.constantValue };
                                } else if (valueInfo.isCall) {
                                } else if (valueInfo.isBinding) {
                                    argumentBindings[index] = { binding: valueInfo.valueBindingPath };
                                } else {
                                }
                                if (msls_isNullableType(argExpression.parameter.parameterType)) {
                                    argumentBindings[index].optional = true;
                                }
                            }
                        }
                        for (var iParameter = 0; iParameter < parameters.length; iParameter++) {
                            if (!argumentBindings[iParameter]) {
                                argumentBindings[iParameter] = {};
                                if (msls_isNullableType(parameters[iParameter].parameterType) ||
                                    msls_iterate(info.createNewEntities).any(
                                        function (attr) {
                                            return attr.targetParameter === parameters[iParameter];
                                        }
                                        )) {
                                    argumentBindings[iParameter].optional = true;
                                }
                            }
                        }
                    }
                }
            }
        }

        info.isBinding = true;


        return info;
    }

    function _determineContextForConstantExpression(links) {
        return null;
    }

    function _determineContextForContentItemRelativeExpression(links) {

        var defaultContext = "data";

        if (links.length === 0) {
            return defaultContext;
        } else {
            switch (_determineRelativeType(links[0])) {
                case "Screen":
                    return "screen";

                case "Application":
                    return "application";

                case "EntityType":
                    return defaultContext;

                default:
                    return null;
            }
        }
    }

    function _determineContextForScreenRelativeExpression(links) {

        if (links.length === 0) {
            return "";
        } else {
            switch (_determineRelativeType(links[0])) {
                case "Screen":
                    return "";
                case "EntitySets":
                    return "";
                default:
                    return null;
            }
        }
    }

    function _determineRelativeType(expression) {

        var source = (expression.member || expression.target),
            modelParent;
        if (source) {
            var idOfModelParent = source.id.replace(/[\/].*/, "");

            modelParent = msls.services.modelService.tryLookupById(idOfModelParent);
            if (!modelParent && msls_getApplicationDefinition().name === idOfModelParent) {
                return "Application";
            }
        }

        if (msls_isApplicationDefinition(modelParent)) {
            return "Application";
        } else if (msls_isScreenDefinition(modelParent)) {
            return "Screen";
        } else if (msls_isEntityType(modelParent)) {
            return "EntityType";
        } else if (msls_isEntityContainer(modelParent)) {
            return "EntitySets";
        }

        return;
    }

    function combineBindingPaths() {

        var fullPath = null;
        $.each(arguments, function (index, path) {
            if (!!path) {
                fullPath = !!fullPath ? [fullPath, path].join(".") : path;
            }
        });

        return fullPath;
    }
    msls_combineBindingPaths = combineBindingPaths;

}());

var msls_modal,
    msls_modal_DialogResult,
    msls_modal_DialogButtons,
    msls_modal_showError;

(function () {
    var _MessageBoxButtons,
        _MessageBoxResult;

    msls_setProperty(msls, "modal", {});
    msls_modal = msls.modal;


    msls_defineEnum(msls_modal, {
        DialogResult: {
            none: 0,
            cancel: 1,
            ok: 2,
            yes: 4,
            no: 8
        }
    });
    msls_modal_DialogResult = msls_modal.DialogResult;

    msls_defineEnum(msls_modal, {
        DialogButtons: {
            none: 0,
            ok: msls_modal_DialogResult.ok,
            okCancel: msls_modal_DialogResult.ok | msls_modal_DialogResult.cancel,
            yesNo: msls_modal_DialogResult.yes | msls_modal_DialogResult.no,
            yesNoCancel: msls_modal_DialogResult.yes | msls_modal_DialogResult.no | msls_modal_DialogResult.cancel
        }
    });
    msls_modal_DialogButtons = msls_modal.DialogButtons;

    function createButtonOption(dialogResult) {

        var buttonOption = { result: dialogResult };

        switch (dialogResult) {
            case msls_modal_DialogResult.cancel:
                buttonOption.text = msls_getResourceString("dialogService_cancel");
                buttonOption.icon = "back";
                break;
            case msls_modal_DialogResult.ok:
                buttonOption.text = msls_getResourceString("dialogService_ok");
                buttonOption.icon = "check";
                break;
            case msls_modal_DialogResult.yes:
                buttonOption.text = msls_getResourceString("dialogService_yes");
                buttonOption.icon = "check";
                break;
            case msls_modal_DialogResult.no:
                buttonOption.text = msls_getResourceString("dialogService_no");
                buttonOption.icon = "delete";
                break;
            default:
                return;
        }

        return buttonOption;
    }

    function ensureButtonOptionArray(buttons) {
        var result = [];
        if (buttons) {
            if (Array.isArray(buttons)) {
                result = buttons;
            } else if (typeof buttons === "number" &&
                msls_isEnumValueDefined(msls_modal_DialogButtons, buttons)) {
                [
                    msls_modal_DialogResult.ok,
                    msls_modal_DialogResult.yes,
                    msls_modal_DialogResult.no,
                    msls_modal_DialogResult.cancel
                ].forEach(function (dialogResultValue) {
                    if ((buttons & dialogResultValue) === dialogResultValue) {
                        result.push(createButtonOption(dialogResultValue));
                    }
                });
            }
        }
        return result;
    }

    msls_setProperty(msls_modal, "show", function (options) {
        return msls_promiseOperation(function initShow(operation) {
            options.buttons = ensureButtonOptionArray(options.buttons);
            msls_modal._modalView.show(options).then(function onComplete(result) {
                operation.complete(result);
            });
        });
    });

    msls_setProperty(msls_modal, "close", function () {
        msls_modal._modalView.close();
    });


    msls_setProperty(msls_modal, "isOpen", function isOpen() {
        return msls_modal._modalView.isOpen();
    });

    msls_modal_showError =
    function showError(error, defaultTitle) {

        var
        title = "Error",
        errors,
        message;

        if (error.noErrorDialog) {
            return WinJS.Promise.as();
        }

        if (error.title && typeof error.title === "string") {
            title = error.title;
        } else if (!!defaultTitle && typeof defaultTitle === "string") {
            title = defaultTitle;
        }

        function getMessage(e) {
            if (e && e.message && typeof e.message === "string") {
                return e.message;
            } else if (typeof e === "string") {
                return e;
            }
            return null;
        }
        if (Array.isArray(error)) {
            message = "";
            errors = error;
            errors.forEach(function (errorItem) {
                var m = getMessage(errorItem);
                if (m) {
                    if (message) {
                        message += "\r\n";
                    }
                    message += m;
                }
            });
        } else {
            message = getMessage(error);
        }

        return msls_modal.show({
            title: title,
            message: message,
            buttons: msls_modal_DialogButtons.ok
        });
    };


    msls_defineEnum(msls, {
        MessageBoxButtons: {
            ok: msls_modal_DialogButtons.ok,
            okCancel: msls_modal_DialogButtons.okCancel,
            yesNo: msls_modal_DialogButtons.yesNo,
            yesNoCancel: msls_modal_DialogButtons.yesNoCancel
        }
    });
    _MessageBoxButtons = msls.MessageBoxButtons;

    msls_defineEnum(msls, {
        MessageBoxResult: {
            ok: msls_modal_DialogResult.ok,
            yes: msls_modal_DialogResult.yes,
            no: msls_modal_DialogResult.no,
            cancel: msls_modal_DialogResult.cancel
        }
    });
    _MessageBoxResult = msls.MessageBoxResult;

    msls_expose("MessageBoxButtons", msls.MessageBoxButtons);
    msls_expose("MessageBoxResult", msls.MessageBoxResult);
    msls_expose("showMessageBox", function showMessageBox(message, options) {
        options = options || {};
        
        var buttons = options.buttons || _MessageBoxButtons.ok,
            defaultResult = options.defaultResult;

        if (!defaultResult) {
            switch (buttons) {
                case _MessageBoxButtons.ok:
                    defaultResult = _MessageBoxResult.ok;
                    break;
                case _MessageBoxButtons.okCancel:
                    defaultResult = _MessageBoxResult.cancel;
                    break;
                case _MessageBoxButtons.yesNo:
                    defaultResult = _MessageBoxResult.no;
                    break;
                case _MessageBoxButtons.yesNoCancel:
                    defaultResult = _MessageBoxResult.cancel;
                    break;
                default:
                    defaultResult = _MessageBoxResult.cancel;
                    break;
            }
        }

        return msls_modal.show({
            title: options.title,
            message: message,
            buttons: buttons,
            defaultResult: defaultResult
        });
    });

}());

var msls_commandProgressStartNotification = "CommandProgressStart",
    msls_commandProgressCompleteNotification = "CommandProgressComplete",
    msls_currentActionData;

(function () {

    var commandRunningCount = 0;
    function _onCommandStart(me) {
        var isStarting = commandRunningCount <= 0;
        commandRunningCount++;
        if (isStarting) {
            msls_notify(msls_commandProgressStartNotification);
        }
    }
    function _onCommandComplete(me) {
        commandRunningCount--;
        if (commandRunningCount <= 0) {
            msls_notify(msls_commandProgressCompleteNotification);
        }
    }


    function _computeCanExecute() {

        var me = this,
            method = me._method,
            executionContext = me._executionContext,
            argumentValues = me._argumentValues,
            missingArguments = false;
        if (!method || !executionContext || !argumentValues) {
            return false;
        }

        $.each(argumentValues, function (i, value) {
            if ((value === undefined || value === null) && !me._isOptional(i)) {
                missingArguments = true;
                return false;
            }
            return true;
        });
        if (missingArguments) {
            return false;
        }

        var canExecuteField = method.canExecute;
        var result;
        if ($.isFunction(canExecuteField)) {
            result = !!canExecuteField.apply(executionContext, argumentValues);
        } else if (typeof canExecuteField === "boolean") {
            result = canExecuteField;
        } else {
            result = true;
        }

        return result;
    }

    function _isOptional(index) {
        return false;
    }

    function execute(data) {
        var me = this;
        if (commandRunningCount) {
            return WinJS.Promise.as();
        }
        _onCommandStart(me);
        me._isExecuting = true;
        return msls_promiseOperation(function initExecute(operation) {

            if (!me._computeCanExecute()) {
                msls_throwError("cannotExecuteError", msls_getResourceString("command_cannot"));
            }

            msls_currentActionData = data;

            var synchronousResult;
            try {
                synchronousResult = me._method.apply(me._executionContext, me._argumentValues);
            }
            finally {
                msls_currentActionData = null;
            }

            if (WinJS.Promise.is(synchronousResult)) {
                var promise = synchronousResult;
                promise.then(function (result) {
                    operation.complete(result);
                }, function (error) {
                    operation.error(error);
                });
            } else {
                operation.complete(synchronousResult);
            }
        })._thenEx(function (error, result) {
            me._isExecuting = false;
            _onCommandComplete(me);

            if (error) {
                throw error;
            }
            return result;
        });
    }

    msls_defineClass(msls, "Command",
        function Command(method, executionContext, argumentValues) {

            this._method = method;
            this._executionContext = executionContext;
            this._argumentValues = argumentValues;
            this.options = {};
        },
        null,
        {
            _method: msls_observableProperty(null),
            _executionContext: msls_observableProperty(null),
            _argumentValues: msls_observableProperty(null),
            _isExecuting: msls_observableProperty(false),
            canExecute: msls_computedProperty(
                function canExecute_compute() {
                    return !this._isExecuting &&
                        _computeCanExecute.call(this);
                }
            ),

            execute: execute,
            _computeCanExecute: _computeCanExecute,
            _isOptional: _isOptional
        }
    );

}());

(function () {

    msls_defineClass(msls, "BoundCommand",
        function BoundCommand(bindingPath, bindingSource, boundArguments) {

            msls.Command.prototype.constructor.call(this, null, null, null);


            msls_throwIfFalsy(bindingSource, "bindingSource");

            var me = this;

            var methodBinding = (new msls.data.DataBinding(bindingPath, bindingSource, "_method", me));
            methodBinding.bind();


            var contextBindingPath = bindingPath.replace(/[.][^.]+$/, "");
            if (bindingPath === contextBindingPath) {
                me._executionContext = bindingSource;
            } else {
                var contextBinding = (new msls.data.DataBinding(contextBindingPath, bindingSource, "_executionContext", me));
                contextBinding.bind();

            }

            if (!!boundArguments && boundArguments.length > 0) {
                msls_setProperty(me, "_boundArguments", boundArguments);
                me._argumentValues = me._boundArguments.getCurrentValues();
                boundArguments.addChangeListener(null, function () {
                    me._argumentValues = me._boundArguments.getCurrentValues();
                });
            } else {
                me._argumentValues = [];
            }
        },
        msls.Command, {
            _isOptional: function _isOptional(index) {
                return !!this._boundArguments["arg" +
                    index.toString() + ".optional"];
            },

            _onDispose: function _onDispose() {
                var me = this;
                if (me._boundArguments) {
                    msls_dispose(me._boundArguments);
                    me._boundArguments = null;
                }
            }
        }
    );

}());

var msls_BoundaryOption,
    msls_NavigateBackOption,
    msls_NavigateBackAction;

(function () {

    msls_defineEnum(msls, {
        BoundaryOption: {
            none: "none",
            nested: "nested",
            save: "save"
        }
    });
    msls_BoundaryOption = msls.BoundaryOption;

    msls_defineEnum(msls, {
        NavigateBackOption: {
            none: "none",
            saveBoundary: "saveBoundary",
            beforeSaveBoundary: "beforeSaveBoundary"
        }
    });
    msls_NavigateBackOption = msls.NavigateBackOption;

    msls_defineEnum(msls, {
        NavigateBackAction: {
            cancel: "cancel",
            commit: "commit"
        }
    });
    msls_NavigateBackAction = msls.NavigateBackAction;

    msls_expose("NavigateBackAction", msls_NavigateBackAction);

}());

(function () {





    function _applyPropertyOverrides(me, overrideDefinition) {

        var defaultValueSource = overrideDefinition.defaultValueSource;
        if (defaultValueSource) {
            _applyDefaultValueOverride(me, defaultValueSource);
        }

        var isReadOnly = overrideDefinition.isReadOnly;
        if (typeof isReadOnly !== "undefined") {
            me._isReadOnly = !!isReadOnly;
        }

    }

    function _applyDefaultValueOverride(me, defaultValueExpression) {

        if (defaultValueExpression) {
            me._defaultValue = msls_parseConstantExpression(defaultValueExpression);
        }
    }

    function _clone(description) {

        var newDescription = new msls.PropertyDescription(description.propertyDefinition);
        newDescription._defaultValue = description._defaultValue;
        newDescription._isReadOnly = description._isReadOnly;


        return newDescription;
    }

    function applyPropertyOverrides(overrideDefinition) {
 
        var newDescription = _clone(this);
        _applyPropertyOverrides(newDescription, overrideDefinition);
        return newDescription;
    }

    function applyDefaultValueOverride(defaultValueExpression) {

        var newDescription = _clone(this);
        _applyDefaultValueOverride(newDescription, defaultValueExpression);
        return newDescription;
    }

    function applyDefaultValueOverrideFromConstant(defaultValue) {

        var newDescription = _clone(this);
        newDescription._defaultValue = defaultValue;
        return newDescription;
    }

    msls_defineClass(msls, "PropertyDescription", function (propertyDefinition) {

        this.propertyDefinition = propertyDefinition;

        var propertyType = propertyDefinition.propertyType;
        if (!propertyType) {
        } else if (!msls_isPrimitiveType(propertyType)) {
        }

        _applyDefaultValueOverride(this, propertyDefinition.defaultValueSource);
        this._isReadOnly = !!propertyDefinition.isReadOnly;
    }, null, {
        _defaultValue: null,

        isReadOnly: msls_accessorProperty(function () {
            return this._isReadOnly;
        }),
        defaultValue: msls_accessorProperty(function () {
            return this._defaultValue;
        }),
        propertyType: msls_accessorProperty(function () {
            return this.propertyDefinition.propertyType;
        }),
        isAttachable: msls_accessorProperty(function () {
            return !!this.propertyDefinition.isAttachable;
        }),
        isInheritable: msls_accessorProperty(function () {
            return !!this.propertyDefinition.isInheritable;
        }),
        propertyId: msls_accessorProperty(function () {
            return this.propertyDefinition.id;
        }),
        propertyName: msls_accessorProperty(function () {
            return this.propertyDefinition.name;
        }),

        applyPropertyOverrides: applyPropertyOverrides,
        applyDefaultValueOverride: applyDefaultValueOverride,
        applyDefaultValueOverrideFromConstant: applyDefaultValueOverrideFromConstant
    });

}());

(function () {

    function setValue(propertyId, value) {

        if (!(propertyId in this.values)) {
            return;
        }

        _setValueInternal(this, propertyId, value);
    }

    function _setValueInternal(me, propertyId, value) {

        var property = msls.services.modelService.tryLookupById(propertyId);

        var shortKey = msls_getProgrammaticName(property.name, true);

        if (shortKey in me.values) {
            delete me.values[shortKey];
            delete me.values[propertyId];
        }

        Object.defineProperty(me.values, shortKey, {
            configurable: true, enumerable: true,
            writable: false, value: value
        });
        Object.defineProperty(me.values, propertyId, {
            configurable: true, enumerable: true,
            writable: false, value: value
        });
    }

    msls_defineClass(msls, "PropertyDictionary",
        function (propertyDescriptions, contentItemName) {

            var me = this;

            this.descriptions = propertyDescriptions;
            this.values = {};
            this.contentItemName = contentItemName;

            $.each(propertyDescriptions, function (key, description) {
                _setValueInternal(me, description.propertyId, description.defaultValue);
            });


        }, null, {
            setValue: setValue
        }
    );

}());

var msls_clearPropertyResolutionCaches;

(function () {
    var guaranteedControl_RootControlId = ":RootControl";

    var __rootControl;

    var __commonPropertyDescriptions,
        __immediateChildrenAttachedProperties;

    function resolveProperties(view) {



        _resolveCommonPropertyDescriptions(this);

        _processViewSpecificProperties(this, view);
        _processControlPropertySources(this, view);

        _processParentPropertySourcesForChildren(this, this._parentView);
        _processPlaceholderPropertySources(this, this._placeholderInParent);

        this._stateIsResolved = true;
        return this._properties;
    }

    msls_clearPropertyResolutionCaches =
    function clearPropertyResolutionCaches() {
        __rootControl = null;
        __commonPropertyDescriptions = null;
        __immediateChildrenAttachedProperties = null;
    };

    function _isPropertyDefinedByParentView(me, propertyDefinition) {

        var control;
        if (!propertyDefinition || !(control = msls_getControlForPropertyDefinition(propertyDefinition))) {
            return false;
        }

        var parentControl = me._parentView;

        while (parentControl) {
            if (control.id === parentControl.id) {
                return true;
            }

            parentControl = parentControl.baseControl;
        }

        return false;
    }

    function _getAllCommonPropertyDescriptions(me) {

        if (!__commonPropertyDescriptions) {
            __commonPropertyDescriptions = [];
            __immediateChildrenAttachedProperties = [];
            var common = _getAllCommonPropertyDefinitions(me);
            $.each(common, function (index, definition) {
                if (definition.isAttachable &&
                    definition.attachedPropertyAvailability === "ImmediateChildren") {
                    __immediateChildrenAttachedProperties.push(new msls.PropertyDescription(definition));
                } else {
                    __commonPropertyDescriptions.push(new msls.PropertyDescription(definition));
                }
            });
        }

        return __commonPropertyDescriptions;
    }

    function _getAllCommonPropertyDefinitions(me) {

        var definitions = [];

        var allControls = msls_findGlobalItems(msls_isControlDefinition);
        $.each(allControls, function (index, controlDefinition) {

            if (controlDefinition.properties) {
                $.each(controlDefinition.properties, function (index2, propertyDefinition) {
                    if (propertyDefinition.isInheritable && !propertyDefinition.isAttachable) {
                    }

                    if (propertyDefinition.isAttachable) {
                        definitions.push(propertyDefinition);
                    }
                });
            }
        });

        if (!!__rootControl && !!__rootControl.properties) {
            $.each(__rootControl.properties, function (index, propertyDefinition) {
                if (!propertyDefinition.isAttachable) {
                    definitions.push(propertyDefinition);
                }
            });
        }

        return definitions;
    }

    function _getCommonPropertyDescriptionsCopy(me) {

        var descriptions = _getAllCommonPropertyDescriptions(me).slice(0);

        $.each(__immediateChildrenAttachedProperties, function (index, description) {
            if (_isPropertyDefinedByParentView(me, description.propertyDefinition)) {
                descriptions.push(description);
            }
        });

        return descriptions;
    }

    function _resolveNonCommonPropertiesForView(me, view) {

        var control = view;
        if (!!control) {
            _resolveNonCommonPropertiesForViewHelper(me, control);
        }
    }

    function _resolveNonCommonPropertiesForViewHelper(me, control) {


        var superControl = control.baseControl;
        if (!superControl) {
            superControl = __rootControl;
        }

        if (superControl) {
            if (!__rootControl || superControl.id !== __rootControl.id) {
                _resolveNonCommonPropertiesForViewHelper(me, superControl);
            }
        }

        if (control.propertyOverrides) {
            $.each(control.propertyOverrides, function (index, overrideDefinition) {
                var id = overrideDefinition.property.id,
                    propertyToOverride = me._properties[id];
                if (!propertyToOverride) {
                }

                me._properties[id] = propertyToOverride.applyPropertyOverrides(overrideDefinition);
            });
        }

        if (control.properties) {
            $.each(control.properties, function (index, propertyDefinition) {
                if (!propertyDefinition.isAttachable) {
                    me._properties[propertyDefinition.id] = new msls.PropertyDescription(propertyDefinition);
                }
            });
        }
    }

    function _resolveCommonPropertyDescriptions(me) {

        var commonProperties = _getCommonPropertyDescriptionsCopy(me);

        $.each(commonProperties, function (index, commonProperty) {
            var ownerValue;
            if (commonProperty.isInheritable && !!me._ownerPropertyValues && !!(ownerValue = me._ownerPropertyValues[commonProperty.propertyDefinition.id])) {

                commonProperty = commonProperty.applyDefaultValueOverrideFromConstant(ownerValue);
            }

            me._properties[commonProperty.propertyDefinition.id] = commonProperty;
        });
    }

    function _overridePropertyDescriptionDefaultValue(me, property, newDefaultValueExpression) {

        var id = property.id,
            propertyInDictionary = me._properties[id];
        if (propertyInDictionary) {
            me._properties[id] = propertyInDictionary.applyDefaultValueOverride(newDefaultValueExpression);
        } else {
        }
    }

    function _processViewSpecificProperties(me, view) {

        if (!view) {
            return;
        }

        _resolveNonCommonPropertiesForView(me, view);
    }

    function _processControlPropertySources(me, control) {

        if (!!control && !!control.propertySources) {
            _processPropertySources(me, control.propertySources);
        }
    }

    function _processParentPropertySourcesForChildren(me, parentControl) {

        if (!!parentControl && !!parentControl.childItemPropertySources) {
            _processPropertySources(me, parentControl.childItemPropertySources);
        }
    }

    function _processPlaceholderPropertySources(me, placeholder) {

        if (!!placeholder && !!placeholder.propertySources) {
            _processPropertySources(me, placeholder.propertySources);
        }
    }

    function _processPropertySources(me, propertySources) {

        $.each(propertySources, function (index, source) {
            _overridePropertyDescriptionDefaultValue(me, source.property, source.source);
        });
    }

    msls_defineClass(msls, "PropertyDefaultsResolver", function (
        friendlyContentItemId,
        ownerPropertyValues,
        placeholderInParent,
        parentView
    ) {


        msls_setProperty(this, "_ownerPropertyValues", ownerPropertyValues);
        msls_setProperty(this, "_placeholderInParent", placeholderInParent);
        msls_setProperty(this, "_parentView", parentView);
        msls_setProperty(this, "_properties", {});

        if (!__rootControl) {
            __rootControl = msls.services.modelService.tryLookupById(guaranteedControl_RootControlId);
        }

    }, null, {
        _stateIsResolved: false,
        resolveProperties: resolveProperties
    });

}());

var msls_initScreen,
    msls_initScreenDetails,
    msls_makeVisualCollection,
    msls_initVisualCollection,
    msls_initVisualCollectionDetails,
    msls_Screen_rawGetCollectionPropertyValue;

(function () {

    msls_defineClassWithDetails(msls, "Screen",
        function Screen(dataWorkspace, modelId, screenParameters) {
            msls_BusinessObject.call(this);
            msls_initScreen(this, dataWorkspace, modelId, screenParameters);
        },
        function Screen_Details(owner) {
            msls_BusinessObject_Details.call(this, owner);
            msls_initScreenDetails(this, owner);
        },
        msls_BusinessObject
    );

    msls_defineClass(msls, "VisualCollection",
        function VisualCollection(screenDetails, loader) {
            msls_initVisualCollection(this, screenDetails, loader);
        }
    );

}());

var msls_AttachedLabelPosition,
    msls_HorizontalAlignment,
    msls_WidthSizingMode,
    msls_HeightSizingMode,
    msls_ContentItemKind,
    msls_PageKind,
    msls_VisualState,
    msls_builtIn_isDynamicTileProperty = msls_getControlPropertyId("IsDynamicTile", "TileList"),
    msls_builtIn_widthSizingModeProperty = msls_getControlPropertyId("WidthSizingMode"),
    msls_isUsingViewerControl,
    msls_setStringValueValidationResult,
    msls_clearStringValueValidationResult;

(function () {

    var _DataBinding = msls.data.DataBinding,
        msls_builtIn_horizontalAlignmentProperty = msls_getControlPropertyId("HorizontalAlignment"),
        msls_builtIn_heightSizingModeProperty = msls_getControlPropertyId("HeightSizingMode"),
        msls_builtIn_tapProperty = msls_getControlPropertyId("Tap"),
        msls_builtIn_hiddenIfDisabledProperty = msls_getControlPropertyId("HiddenIfDisabled", "RootCommand"),
        validationResultsPropertyName = "validationResults";

    msls_defineEnum(msls, {
        AttachedLabelPosition: {
            leftAligned: "LeftAligned",
            rightAligned: "RightAligned",
            topAligned: "Top",
            hidden: "Hidden",
            none: "None"
        }
    });
    msls_AttachedLabelPosition = msls.AttachedLabelPosition;

    msls_defineEnum(msls, {
        HorizontalAlignment: {
            left: "Left",
            right: "Right"
        }
    });
    msls_HorizontalAlignment = msls.HorizontalAlignment;

    msls_defineEnum(msls, {
        WidthSizingMode: {
            stretchToContainer: "StretchToContainer",
            fitToContent: "FitToContent",
            fixedSize: "FixedSize"
        }
    });
    msls_WidthSizingMode = msls.WidthSizingMode;

    msls_defineEnum(msls, {
        HeightSizingMode: {
            stretchToContainer: "StretchToContainer",
            fitToContent: "FitToContent",
            fixedSize: "FixedSize"
        }
    });
    msls_HeightSizingMode = msls.HeightSizingMode;

    msls_defineEnum(msls, {
        ContentItemKind: {
            collection: "Collection",
            command: "Command",
            value: "Value",
            details: "Details",
            group: "Group",
            screen: "Screen",
            tab: "Tab",
            popup: "Popup"
        }
    });
    msls_ContentItemKind = msls.ContentItemKind;

    msls_defineEnum(msls, {
        PageKind: {
            none: "None",
            tab: "Tab",
            popup: "Popup",
        }
    });
    msls_PageKind = msls.PageKind;

    msls_defineEnum(msls, {
        VisualState: {
            hidden: "hidden",

            loading: "loading",

            hasDisplayError: "hasDisplayError",

            disabled: "disabled",

            readOnly: "readOnly",

            hasValidationError: "hasValidationError",

            normal: "normal"
        }
    });
    msls_VisualState = msls.VisualState;


    function _onDispose() {
        var me = this;

        me.children.forEach(msls_dispose);
        me.children = null;

        me.commandItems.forEach(msls_dispose);
        me.commandItems = null;

        me._binding = null;
        me._detailsBinding = null;
        me._choicesSourceBinding = null;
        me._externalBindings = null;

        me.parent = null;
        me._view = null;

        me.__details = null;
        me.__screen = null;
        me.__value = null;
        me.__data = null;
        me.__choicesSource = null;
    }

    function _initialize(initialData) {

        var me = this,
            model = me.model,
            choicesSource = model.choicesSource,
            choicesSourceExpressionInfo;

        me.kind = model.kind;
        me.name = model.name;
        me.displayName = msls_getLocalizedString(model.displayName);
        me.description = msls_getLocalizedString(model.description);


        if (choicesSource) {
            choicesSourceExpressionInfo = msls_parseContentItemRelativeExpression(choicesSource);
            me._choicesSourceBindingPath = choicesSourceExpressionInfo.valueBindingPath;
        }

        me._initializeCore(initialData);
    }

    function _initializeCore(initialData) {

        var me = this,
            model = me.model;
        me.data = initialData;
        me.children = [];
        me.commandItems = [];

        me._parseDataSource();

        if (!!me.parent && me.parent.kind !== "Collection") {
            me.data = me.parent.value;
        }

        me._resolveProperties();
        _cacheCommonPropertyValues(me);
        me._parseChoiceList();

        if (me.kind === msls_ContentItemKind.value) {
            if (me.valueModel) {
                var attribute = msls_getAttribute(me.valueModel, ":@MaxLength");
                if (!!attribute) {
                    me.maxLength = attribute.value;
                }
            }
        }

        if (!!me.parent && me.parent._isActivated) {
            me._activate();
        }
        me._isUnderList = !!me.parent && (me.parent.kind === msls_ContentItemKind.collection || me.parent._isUnderList);
    }

    function _activate() {

        var me = this,
            i, len;

        if (!me._bindingInitialized) {
            msls_setProperty(me, "_bindingInitialized", true);

            _initializeBindings(me);

        } else {
            if (!!me._detailsBinding) {
                me._detailsBinding.activate();
            }

            if (!!me._binding) {
                me._binding.activate();
            }

            if (!!me._choicesSourceBinding) {
                me._choicesSourceBinding.activate();
            }

            var bindings = me._externalBindings;
            if (!!bindings) {
                for (i = 0, len = bindings.length; i < len; i++) {
                    bindings[i].activate();
                }
            }
        }

        for (i = 0, len = me.children.length; i < len; i++) {
            me.children[i]._activate();
        }
        for (i = 0, len = me.commandItems.length; i < len; i++) {
            me.commandItems[i]._activate();
        }

        me._isActivated = true;
    }

    function _deactivate() {

        var me = this,
            i, len;

        if (!!me._detailsBinding) {
            me._detailsBinding.deactivate();
        }

        if (!!me._binding) {
            me._binding.deactivate();
        }

        if (!!me._choicesSourceBinding) {
            me._choicesSourceBinding.deactivate();
        }

        var bindings = me._externalBindings;
        if (!!bindings) {
            for (i = 0, len = bindings.length; i < len; i++) {
                bindings[i].deactivate();
            }
        }

        for (i = 0, len = me.children.length; i < len; i++) {
            me.children[i]._deactivate();
        }
        for (i = 0, len = me.commandItems.length; i < len; i++) {
            me.commandItems[i]._deactivate();
        }

        me._isActivated = false;
    }

    function _refreshStringValue() {

        var me = this,
            i, len, c;

        if (!!me._stringValueConversionError) {
            try {
                me._doNotUpdateValue = true;
                setStringValueFromValue(me);
            } finally {
                me._doNotUpdateValue = false;
            }
        }

        c = me.children;
        for (i = 0, len = c.length; i < len; i++) {
            c[i]._refreshStringValue();
        }
    }

    function _setParent(parentCI) {
        this.parent = parentCI;
        parentCI.children.push(this);
    }

    function _setCommandItemParent(parentCI) {

        this.parent = parentCI;
        parentCI.commandItems.push(this);
    }

    function findItem(contentItemName) {

        var index = 0,
            result,
            isClone = this._isClone,
            child;

        if (this.name === contentItemName) {
            return this;
        }

        if (!!this.children) {
            while (index < this.children.length) {
                child = this.children[index++];
                if (child._isClone === isClone) {
                    result = child.findItem(contentItemName);
                    if (!!result) {
                        return result;
                    }
                }
            }
        }

        index = 0;
        if (!!this.commandItems) {
            while (index < this.commandItems.length) {
                child = this.commandItems[index++];
                if (child._isClone === isClone) {
                    result = child.findItem(contentItemName);
                    if (!!result) {
                        return result;
                    }
                }
            }
        }

        return result;
    }

    msls_isUsingViewerControl =
    function isUsingViewerControl(me) {
        var controlModel = me.controlModel;
        if (!controlModel) {
            return false;
        }
        return controlModel.isViewer;
    };

    function _validate(me, recursive, isOperation) {
        var results,
            details = me.details,
            children = me.children,
            i,
            len;

        if (!!details && me.kind === msls_ContentItemKind.value && !msls_isUsingViewerControl(me)) {
            results = msls_validate(details, me.value, isOperation);
        }

        if (!results) {
            clearInternalValidationResults(me);
        } else {
            if (!!me._stringValueConversionError) {
                results.push(me._stringValueConversionError);
            }
            setInternalValidationResults(me, results);
        }

        if (recursive) {
            for (i = 0, len = children.length; i < len; i++) {
                _validate(children[i], recursive, isOperation);
            }
        }
    }

    function validate(recursive) {
        _validate(this, recursive, true);
    }

    function hasValidationErrors(recursive) {
        if (this.validationResults.length) {
            return true;
        }

        if (recursive) {
            return msls_iterate(this.children).any(function () {
                return this.hasValidationErrors(recursive);
            });
        }
        return false;
    }

    function dataBind(bindingPath, callback) {
        if (!callback || !$.isFunction(callback)) {
            throw msls_getResourceString("databinding_invalid_callback");
        }

        var binding = new msls.data.DataBinding(bindingPath, this, "", callback,
                msls_data_DataBindingMode.oneWayFromSource);
        binding.bind();

        if (!this._externalBindings) {
            msls_setProperty(this, "_externalBindings", [binding]);
        } else {
            this._externalBindings.push(binding);
        }
    }


    function _isPage(me) {
        return me.pageKind !== msls_PageKind.none;
    }

    function virtual_parseDataSource() {

        var me = this,
            model = me.model,
            bindToParent = !!me.parent && me.parent.kind !== "Collection";

        if (!model.dataSource) {
            me.bindingPath = "data";
            if (bindToParent) {
                msls_setProperty(me, "_detailsBindingPath", "parent.details");
            }
        } else {
            if (me.kind === msls_ContentItemKind.command) {
                me.bindingPath = null;
                msls_setProperty(me, "_detailsBindingPath", null);
            } else {
                var expressionInfo = msls_parseContentItemRelativeExpression(model.dataSource);

                me.bindingPath = expressionInfo.valueBindingPath;
                if (me.bindingPath === "data" && bindToParent) {
                    msls_setProperty(me, "_detailsBindingPath", "parent.details");
                } else {
                    msls_setProperty(me, "_detailsBindingPath", expressionInfo.detailsBindingPath);
                }
                me.valueModel = expressionInfo.lastModelItem;
            }
        }
    }

    function _initializeBindings(me) {
        var choicesSourceBindingPath;

        if (!!me._detailsBindingPath) {
            msls_setProperty(me, "_detailsBinding", new _DataBinding(me._detailsBindingPath, me, "details", me, msls_data_DataBindingMode.oneWayFromSource));
            me._detailsBinding.bind();
        }

        if (!!me.bindingPath) {
            msls_setProperty(me, "_binding", new _DataBinding(me.bindingPath, me, "value", me));
            me._binding.bind();
        }

        choicesSourceBindingPath = me._choicesSourceBindingPath;
        if (choicesSourceBindingPath) {
            msls_setProperty(me, "_choicesSourceBinding",
                new _DataBinding(choicesSourceBindingPath, me, "choicesSource", me));
            me._choicesSourceBinding.bind();
        }

        function runValidation() {
            var details = me.details,
                entity = details && details.owner,
                entityDetails = entity && entity.details;

            if (me.kind === msls_ContentItemKind.value) {
                if (me._stringValueUpdating ||
                    (!!details &&
                     (details.isChanged || (!!entityDetails && entityDetails.entityState === msls.EntityState.added)))) {
                    _validate(me, false, false);
                } else {
                    clearInternalValidationResults(me);
                }
            }

            me._validated = true;
        }

        me.addChangeListener("details", function onDetailsChange() {
            me._validated = false;
            msls_dispatch(function () {
                if (!me._validated) {
                    runValidation();
                }
            });
        });

        me.addChangeListener("value", function onValueChange() {
            me._valueUpdating = true;
            try {
                if (!me._stringValueUpdating && me.kind === msls_ContentItemKind.value) {
                    setStringValueFromValue(me);
                }
                runValidation();

                if (me.kind !== msls_ContentItemKind.collection) {
                    var value = me.value,
                        children = me.children,
                        commandItems = me.commandItems,
                        i, len;

                    if (children) {
                        for (i = 0, len = children.length; i < len; i++) {
                            children[i].data = value;
                        }
                    }
                    if (commandItems) {
                        for (i = 0, len = commandItems.length; i < len; i++) {
                            commandItems[i].data = value;
                        }
                    }
                }
            } finally {
                me._valueUpdating = false;
            }
        });

        me.addChangeListener("stringValue", function onStringValueChange() {
            if (!me._stringValueUpdating) {
                me._stringValueUpdating = true;
                try {
                    if (!me._valueUpdating && !me._doNotUpdateValue && me.kind === msls_ContentItemKind.value) {
                        setValueFromStringValue(me);
                    }
                } finally {
                    me._stringValueUpdating = false;
                }
            }
        });

        if (me.value !== undefined) {
            me.dispatchChange("value");
        }
    }

    function virtual_resolveProperties() {

        var me = this,
            propertiesOwner = me.parent,
            model = me.model,
            ownerPropertyValues = propertiesOwner ? propertiesOwner.properties : {},
            placeholderInParent = null;

        var resolver = new msls.PropertyDefaultsResolver(me.name || me.displayName,
            ownerPropertyValues,
            placeholderInParent, me.parent ? me.parent.controlModel : null);
        var resolvedDescriptions = resolver.resolveProperties(me.controlModel);
        msls_setProperty(me, "_dictionary", new msls.PropertyDictionary(resolvedDescriptions, me.name));

        if (model.propertySources) {
            $.each(model.propertySources, function () {
                var info = _parsePropertySource(me, this);
                me._dictionary.setValue(info.property.id, info.value);
            });
        }
    }

    function _cacheCommonPropertyValues(me) {

        me.horizontalAlignment = me.properties[msls_builtIn_horizontalAlignmentProperty];
        me.widthSizingMode = me.properties[msls_builtIn_isDynamicTileProperty] ? msls_WidthSizingMode.stretchToContainer : me.properties[msls_builtIn_widthSizingModeProperty];
        me.heightSizingMode = me.properties[msls_builtIn_heightSizingModeProperty];
        msls_setProperty(me, "_isHStretch", me.widthSizingMode === msls_WidthSizingMode.stretchToContainer);
        msls_setProperty(me, "_isVStretch", me.heightSizingMode === msls_HeightSizingMode.stretchToContainer);
    }

    function _parsePropertySource(me, propertySource) {


        var property = propertySource.property,
            value;

        if ("value" in propertySource) {
            value = propertySource.value;
        } else {


            if (!!property.isAction && !!propertySource.source) {
                var expressionInfo = msls_parseContentItemRelativeExpression(propertySource.source),
                    boundArguments = msls_createBoundArguments(me, expressionInfo.argumentBindings);
                if (!!expressionInfo.associatedCollection ||
                    expressionInfo.createNewEntities.length > 0) {
                    var targetMethod = expressionInfo.lastModelItem;
                    boundArguments.length = targetMethod.parameters.length;
                    boundArguments["arg" + (boundArguments.length++).toString()] = {
                        canExecute: createCanExecute(me, expressionInfo),
                        beforeShown: createBeforeShown(me, expressionInfo)
                    };
                }
                value = new msls.BoundCommand(
                    expressionInfo.valueBindingPath,
                    me, boundArguments);
                msls_addLifetimeDependency(value, boundArguments);
                msls_addLifetimeDependency(me, value);
            }
        }

        return { property: property, value: value };
    }

    function createCanExecute(me, expressionInfo) {
        return function canExecute() {
            var result = true,
                createNewEntities = expressionInfo.createNewEntities,
                dataWorkspace = me.screen.details.dataWorkspace,
                associatedCollection = expressionInfo.associatedCollection,
                visualCollection, entity;
            if (associatedCollection) {
                visualCollection = me.screen[
                    msls_getProgrammaticName(associatedCollection.name)];
            }
            result = msls_iterate(createNewEntities).all(
                function () {
                    var _EntityClass;
                    if (!associatedCollection && !!this.entityType) {
                        _EntityClass = window.msls.application[this.entityType.name];
                        return msls_EntitySet_getEntitySetForEntityType(
                            dataWorkspace, _EntityClass).canInsert;
                    } else if (associatedCollection) {
                        return visualCollection.addNew.canExecute.apply(visualCollection);
                    }
                    return true;
                }
            );
            if (!result) {
                return result;
            }
            if (!!associatedCollection &&
                !msls_iterate(createNewEntities).first(
                function () { return !this.entityType; })) {
                entity = visualCollection.selectedItem;
                result = !!entity;
            }
            return result;
        };
    }

    function createBeforeShown(me, expressionInfo) {
        if (expressionInfo.createNewEntities.length > 0) {
            return function beforeShown() {
                var targetScreen = this, _EntityClass,
                    visualCollection, newEntity;
                expressionInfo.createNewEntities.forEach(function (createNewEntity) {
                    if (!expressionInfo.associatedCollection &&
                        !!createNewEntity.entityType) {
                        _EntityClass = window.msls.application[createNewEntity.entityType.name];
                        newEntity = new _EntityClass(
                            msls_EntitySet_getEntitySetForEntityType(
                                targetScreen.details.dataWorkspace, _EntityClass
                            )
                        );
                    } else if (expressionInfo.associatedCollection) {
                        visualCollection = me.screen[
                            msls_getProgrammaticName(expressionInfo.associatedCollection.name)];
                        newEntity = visualCollection.addNew();
                    }
                    if (createNewEntity.targetParameter) {
                        targetScreen[msls_getProgrammaticName(createNewEntity.targetParameter.name)] = newEntity;
                    }
                });
            };
        } else {
            return null;
        }
    }

    msls_setStringValueValidationResult =
    function setStringValueValidationResult(me, validationResult) {

        me._stringValueConversionError = validationResult;
        setInternalValidationResults(me, [validationResult]);
    };

    function setInternalValidationResults(me, validationResults) {

        validationResults = validationResults || [];
        validationResults.forEach(function (result) {
            result._isInternal = true;
        });

        var wasEmpty = !me._internalValidationResults || !me._internalValidationResults.length,
            isEmpty = !!validationResults && !validationResults.length;
        if (!(wasEmpty && isEmpty)) {
            me._internalValidationResults = validationResults;
            me.dispatchChange(validationResultsPropertyName);
        }
    }

    function clearInternalValidationResults(me) {
        setInternalValidationResults(me, []);
    }

    msls_clearStringValueValidationResult =
    function clearStringValueValidationResult(me) {

        if (me._stringValueConversionError) {
            me._stringValueConversionError = null;
            clearInternalValidationResults(me);
        }
    };

    function setStringValueFromValue(me) {

        var stringValue = "",
            value = me.value,
            converted = false,
            property;

        msls_clearStringValueValidationResult(me);

        if (value !== undefined && value !== null) {
            if (me.choiceList) {
                $.each(me.choiceList, function () {
                    if (this.value === value) {
                        stringValue = this.stringValue;
                        converted = true;
                        return false;
                    }
                    return true;
                });
            }
            if (!converted) {
                if (!!me.details) {
                    property = me.details.getModel();
                    stringValue = msls_convertToString(value, property);
                } else {
                    stringValue = value.toString();
                }
            }
        }
        me.stringValue = stringValue;
    }

    function setValueFromStringValue(me) {

        var value = me.stringValue,
            converted = false,
            property,
            convertedValue;

        if (me.choiceList) {
            $.each(me.choiceList, function () {
                if (this.stringValue === me.stringValue) {
                    value = this.value;
                    converted = true;
                    return false;
                }
                return true;
            });
        }

        if (!converted && !!me.details) {

            property = me.details.getModel();
            convertedValue = msls_convertFromString(value, property);
            if (convertedValue.error) {
                var validationResult = new msls_ValidationResult(me.details, convertedValue.error);
                msls_setStringValueValidationResult(me, validationResult);
            } else {
                msls_clearStringValueValidationResult(me);

                if (me.value === convertedValue.value) {
                    _validate(me, false, false);
                }
                me.value = convertedValue.value;
                setStringValueFromValue(me);
            }
        } else {
            me.value = value;
        }
    }

    function virtual_parseChoiceList() {

        var me = this,
            dataSource,
            supportedValues,
            i,
            isRequired;

        if (me.kind === msls_ContentItemKind.value) {
            if (me.valueModel) {
                supportedValues = msls_getAttributes(me.valueModel, ":@SupportedValue");
                if (supportedValues) {
                    me.choiceList = [];
                    isRequired = msls_getAttribute(me.valueModel, ":@Required");
                    if (!isRequired) {
                        me.choiceList.push({ value: "", stringValue: "" });
                    }

                    $.each(supportedValues, function (key, value) {
                        me.choiceList.push(
                             {
                                 value: this.value,
                                 stringValue: msls_getLocalizedString(this.displayName) || this.value
                             }
                         );
                    });

                }
            }
        }

    }

    function _pageKind_get() {
        if (this.kind === msls_ContentItemKind.tab) {
            return msls_PageKind.tab;
        } else if (this.kind === msls_ContentItemKind.popup) {
            return msls_PageKind.popup;
        } else {
            return msls_PageKind.none;
        }
    }


    function _computeIsEnabled() {

        var details = this.details;
        if (!details && !this.value) {
            return false;
        }

        var tap;
        if ((this.kind === msls_ContentItemKind.command) &&
            !!(tap = this.properties[msls_builtIn_tapProperty])) {
            if (!tap.canExecute && !tap._isExecuting) {
                return false;
            }
        }

        var owner = details && details.owner,
            ownerDetails = owner && owner.details;
        if (ownerDetails && "entityState" in ownerDetails) {
            var entityState = ownerDetails.entityState;
            if (entityState === msls.EntityState.deleted || entityState === msls.EntityState.discarded) {
                return false;
            }
        }

        var developerIsEnabled = this._backingIsEnabled;
        if (typeof this._backingIsEnabled === "boolean") {
            return developerIsEnabled;
        }

        var parentItem = this.parent;
        if (!!parentItem && !_isPage(this)) {
            return parentItem.isEnabled;
        }

        return true;
    }

    function _setIsEnabled(value) {
        this._backingIsEnabled = value;
    }

    function _computeIsReadOnly() {
        var me = this,
            details = me.details,
            detailsIsReadOnly = details && details.isReadOnly,
            developerIsReadOnly = me._backingIsReadOnly,
            parentItem = me.parent;

        if (typeof detailsIsReadOnly === "boolean" && detailsIsReadOnly) {
            return true;
        }

        if (typeof developerIsReadOnly === "boolean") {
            return developerIsReadOnly;
        }

        if (!!parentItem && !_isPage(me) && parentItem.kind !== msls_ContentItemKind.collection) {
            return parentItem.isReadOnly;
        }

        return false;
    }

    function _setIsReadOnly(value) {
        this._backingIsReadOnly = value;
    }

    function _computeIsVisible() {

        var developerIsVisible = this._backingIsVisible;
        if (typeof developerIsVisible === "boolean") {
            return developerIsVisible;
        }

        if (this.properties[msls_builtIn_hiddenIfDisabledProperty]) {
            if (!this.isEnabled) {
                return false;
            }
        }

        var model = this.model;
        return !model.isHidden;
    }

    function _setIsVisible(value) {
        this._backingIsVisible = value;
    }

    function _computeIsLoading() {
        if (this.kind === msls_ContentItemKind.command) {
            return false;
        }

        var details = this.details;
        if (details) {
            var isLoaded = details.isLoaded;
            if (typeof isLoaded === "boolean") {
                return !isLoaded && !details.loadError && !this.displayError;
            }
        }

        return false;
    }

    function _computeDisplayError() {
        if (this.kind === msls_ContentItemKind.command) {
            return false;
        }

        if (this._backingDisplayError) {
            return this._backingDisplayError;
        }

        var details = this.details;
        return details ? details.loadError : null;
    }

    function _setDisplayError(value) {
        this._backingDisplayError = value;
    }

    function _computeVisualState() {


        if (!this.isVisible) {
            return msls_VisualState.hidden;
        } else if (this.displayError) {
            return msls_VisualState.hasDisplayError;
        } else if (this.isLoading) {
            return msls_VisualState.loading;
        } else if (!this.isEnabled) {
            return msls_VisualState.disabled;
        } else if (this.isReadOnly) {
            return msls_VisualState.readOnly;
        } else if (!!this.validationResults.length && this.kind !== msls_ContentItemKind.command) {
            return msls_VisualState.hasValidationError;
        } else {
            return msls_VisualState.normal;
        }
    }


    msls_defineClass(msls, "ContentItem", function ContentItem(screenObject, model) {



            this.screen = screenObject;
            this.model = model;
        }, null, {
            application: msls_accessorProperty(function application_get() {
                return window.msls.application;
            }),
            choicesSource: msls_observableProperty(),
            data: msls_observableProperty(),
            details: msls_observableProperty(),
            displayName: msls_observableProperty(),
            description: msls_observableProperty(),

            isEnabled: msls_computedProperty(_computeIsEnabled, _setIsEnabled),
            isReadOnly: msls_computedProperty(_computeIsReadOnly, _setIsReadOnly),
            isLoading: msls_computedProperty(_computeIsLoading),
            displayError: msls_computedProperty(_computeDisplayError, _setDisplayError),
            isVisible: msls_computedProperty(_computeIsVisible, _setIsVisible),

            _isActivated: msls_observableProperty(),

            _visualState: msls_computedProperty(_computeVisualState),

            _backingIsEnabled: msls_observableProperty(),
            _backingIsReadOnly: msls_observableProperty(),
            _backingIsVisible: msls_observableProperty(),
            _backingDisplayError: msls_observableProperty(),

            pageKind: msls_accessorProperty(_pageKind_get),
            properties: msls_accessorProperty(
                function properties_get() {
                    return this._dictionary.values;
                }
            ),
            stringValue: msls_observableProperty(),
            value: msls_observableProperty(null,
                function getValue() {
                    return this.__value;
                }, function setValue(value) {
                    var valueModel,
                        propertyType,
                        underlyingTypeId;
                    if ((typeof value === "number") &&
                            !!(valueModel = this.valueModel) &&
                            (propertyType = valueModel.propertyType) &&
                            !!(underlyingTypeId = msls_getUnderlyingTypes(propertyType).primitiveType.id) &&
                            (underlyingTypeId === ":Decimal" || underlyingTypeId === ":Int64")) {
                        value = value.toString();
                    }

                    if (value !== this.__value) {
                        this.__value = value;
                        this.dispatchChange("value");
                    }
                }),
            controlModel: msls_accessorProperty(
                function controlModel_get() {
                    var model = this.model;
                    return model.view;
                }
            ),
            validationResults: msls_observableProperty(null,
                function getValidationResults() {
                    var results = (this._internalValidationResults && this._internalValidationResults.slice(0)) || [],
                        userValidationResults = this._userValidationResults;
                    if (userValidationResults) {
                        results = results.concat(userValidationResults);
                    }

                    return results;
                }, function setValidationResults(validationResults) {
                    if (!validationResults) {
                        validationResults = [];
                    } else if (!Array.isArray(validationResults)) {
                        validationResults = [validationResults];
                    }

                    var me = this,
                        results = validationResults.map(function (result) {
                            if (typeof result === "string") {
                                return new msls.ValidationResult(null, result);
                            }
                            return result;
                        });

                    results = results.filter(function (result) {
                        return !result._isInternal;
                    });

                    var wasEmpty = !me._userValidationResults || !me._userValidationResults.length,
                        isEmpty = !results.length;

                    if (!(wasEmpty && isEmpty)) {
                        me._userValidationResults = results;
                        me.dispatchChange(validationResultsPropertyName);
                    }
                }),
            _stringValueConversionError: msls_observableProperty(),
            _alwaysShowValidationResults: msls_computedProperty(
                function _alwaysShowValidationResults_get() {
                    var result,
                        details;
                    result = this._alwaysShowValidationResultsValue ||
                        (!!this.parent && this.parent._alwaysShowValidationResults) ||
                        !!this._stringValueConversionError;
                    if (!result) {
                        details = this.details;
                        result = !!details && details.isEdited;
                    }
                    return result;
                },
                function _alwaysShowValidationResults_set(value) {
                    this._alwaysShowValidationResultsValue = value;
                }
            ),
            _alwaysShowValidationResultsValue: msls_observableProperty(),

            findItem: findItem,
            validate: validate,
            hasValidationErrors: hasValidationErrors,

            dataBind: dataBind,

            handleViewDispose: function handleViewDispose(handler) {
                if (handler !== null && !$.isFunction(handler)) {
                    throw msls_getResourceString("view_dispose_invalid_handler");
                }
                this._customViewDisposeHandler = handler;
            },

            _initialize: _initialize,
            _activate: _activate,
            _deactivate: _deactivate,
            _initializeCore: _initializeCore,
            _refreshStringValue: _refreshStringValue,
            _setParent: _setParent,
            _setCommandItemParent: _setCommandItemParent,

            _parseDataSource: virtual_parseDataSource,
            _resolveProperties: virtual_resolveProperties,
            _parseChoiceList: virtual_parseChoiceList,

            _onDispose: _onDispose
        }
    );

    msls_expose("ContentItem", msls.ContentItem);
    msls_expose("HorizontalAlignment", msls_HorizontalAlignment);
    msls_expose("WidthSizingMode", msls_WidthSizingMode);
    msls_expose("HeightSizingMode", msls_HeightSizingMode);
    msls_expose("ContentItemKind", msls_ContentItemKind);
    msls_expose("PageKind", msls_PageKind);

}());

(function () {

    function _initialize(initialData) {

        var template = this._template,
            choicesSourceBindingPath = template._choicesSourceBindingPath;

        this.kind = template.kind;
        this.name = template.name;
        this.displayName = template.displayName;
        this.model = template.model;
        this.screen = template.screen;
        if (choicesSourceBindingPath) {
            this._choicesSourceBindingPath = choicesSourceBindingPath;
        }


        this._initializeCore(initialData);
    }


    function override_parseDataSource() {
        this.bindingPath = this._template.bindingPath;
        this._detailsBindingPath = this._template._detailsBindingPath;
        this.valueModel = this._template.valueModel;
    }

    function override_resolveProperties() {
        this._dictionary = this._template._dictionary;
    }

    function override_parseChoiceList() {
        this.choiceList = this._template.choiceList;
    }

    msls_defineClass("ui", "ContentItemClone",
        function ContentItemClone(template) {

            this._template = template;
        }, msls.ContentItem, {
            _initialize: _initialize,
            _parseDataSource: override_parseDataSource,
            _resolveProperties: override_resolveProperties,
            _parseChoiceList: override_parseChoiceList,
            _isClone: true
        }
    );

}());

(function () {

    function ContentItemService() {
    }

    function createContentItemTree(screenObject, contentItemDefinition, parentContentItem, initialData) {
        return _createContentItemTreeHelper(screenObject, contentItemDefinition, parentContentItem, null, initialData);
    }

    function _createContentItemTreeHelper(screenObject, contentItemDefinition, parentContentItem, commandParent, initialData) {
        var i,
            contentItem = new msls.ContentItem(screenObject, contentItemDefinition);


        if (!!parentContentItem) {
            contentItem._setParent(parentContentItem);
        } else if (!!commandParent) {
            contentItem._setCommandItemParent(commandParent);
        }

        contentItem._initialize(initialData);

        if ($.isArray(contentItemDefinition.childContentItems)) {
            for (i = 0; i < contentItemDefinition.childContentItems.length; i++) {
                var childDefinition = contentItemDefinition.childContentItems[i];
                var child = _createContentItemTreeHelper(screenObject, childDefinition, contentItem, null);
            }
        }

        if ($.isArray(contentItemDefinition.commandItems)) {
            for (i = 0; i < contentItemDefinition.commandItems.length; i++) {
                var commandItemDefinition = contentItemDefinition.commandItems[i];
                var commandItem = _createContentItemTreeHelper(screenObject, commandItemDefinition, null, contentItem);
            }
        }

        return contentItem;
    }

    function cloneContentItemTree(template, parentContentItem, initialData) {

        return _cloneContentItemTreeHelper(template, parentContentItem, null, initialData);
    }

    function _cloneContentItemTreeHelper(template, parentContentItem, commandParent, initialData) {
        var i,
            clone = new msls.ui.ContentItemClone(template);


        if (!!parentContentItem) {
            clone._setParent(parentContentItem);
        } else if (!!commandParent) {
            clone._setCommandItemParent(commandParent);
        }

        clone._initialize(initialData);

        for (i = 0; i < template.children.length; i++) {
            var childTemplate = template.children[i];
            var childClone = _cloneContentItemTreeHelper(childTemplate, clone, null);
        }

        for (i = 0; i < template.commandItems.length; i++) {
            var commandItemTemplate = template.commandItems[i];
            var commandItemClone = _cloneContentItemTreeHelper(commandItemTemplate, null, clone);
        }

        return clone;
    }

    msls_defineClass("ui", "ContentItemService", ContentItemService, null, {
        createContentItemTree: createContentItemTree,
        cloneContentItemTree: cloneContentItemTree
    });

    msls_setProperty(msls.services, "contentItemService", new ContentItemService());

}());

var msls_createScreen;

(function () {

    var _Screen = msls.Screen,
        _ScreenDetails = _Screen.Details;

    function getLocalPropertyValue(details) {
        return details.screen["__" + this.name];
    }

    function setLocalPropertyValue(details, value) {
        var propertyName = this.name,
            localProperty = details.properties[propertyName],
            screenObject = details.screen;

        msls_setProperty(screenObject, "__" + propertyName, value);
        localProperty.dispatchChange("value");
        screenObject.dispatchChange(propertyName);
    }

    function getRemotePropertyValue(details) {
        var propertyName = this.name,
            remoteProperty = details.properties[propertyName],
            data = details._propertyData[propertyName],
            autoLoad = true;

        if (!remoteProperty.isLoaded && autoLoad) {
            return remoteProperty.load();
        } else {
            return WinJS.Promise.as(data._value);
        }
    }

    function rawGetCollectionPropertyValue(
        details,
        entry) {
        var data = details._propertyData[entry.name];

        return msls_Screen_rawGetCollectionPropertyValue(details, entry, data);
    }

    function getComputedPropertyValue(details) {
        return this.type.prototype;
    }

    function defineScreen(constructor, properties, methods) {
        var screenClass = constructor,
            details = makeScreenDetails(constructor),
            mixInContent = {};

        msls_defineClassWithDetails(null, null,
            constructor, details, _Screen);

        if (properties) {
            properties.forEach(function (entry) {
                var entryName = entry.name;
                if (typeof entry.kind !== "string") {
                    entry.kind = "local";
                }
                switch (entry.kind) {
                    case "local":
                        if (!entry.type) {
                            entry.type = String;
                        }
                        mixInContent[entryName] = msls_propertyWithDetails(
                            entry, entry.type, _ScreenDetails.LocalProperty);
                        entry.getValue = getLocalPropertyValue;
                        entry.setValue = setLocalPropertyValue;
                        break;
                    case "reference":
                        if (!entry.type) {
                            entry.type = msls.Entity;
                        }
                        mixInContent[entryName] = msls_propertyWithDetails(
                            entry, entry.type, _ScreenDetails.ReferenceProperty);
                        entry.async = true;
                        entry.getValue = getRemotePropertyValue;
                        break;
                    case "collection":
                        entry.type = msls_makeVisualCollection(constructor, entry);
                        if (!entry.elementType) {
                            entry.elementType = msls.Entity;
                        }
                        mixInContent[entryName] = msls_propertyWithDetails(
                            entry, entry.type, _ScreenDetails.CollectionProperty);
                        entry.async = true;
                        entry.getValue = getRemotePropertyValue;
                        entry.rawGet = rawGetCollectionPropertyValue;
                        break;
                }
                entry.get = function () {
                    return entry.getValue(this.details);
                };
                if (entry.setValue) {
                    entry.set = function (value) {
                        entry.setValue(this.details, value);
                    };
                }
            });
        }
        if (methods) {
            methods.forEach(function (entry) {
                if (entry.value) {
                    mixInContent[entry.name] = entry;
                } else {
                    mixInContent[entry.name] = function screenMethod() {
                        var userCode = screenClass[entry.name + "_execute"],
                            result;
                        if (msls_isFunction(userCode)) {
                            result = userCode.call(null, this);
                        }
                        return result;
                    };
                    mixInContent[entry.name].canExecute = function canExecute() {
                        var result = true,
                            userCode = screenClass[entry.name + "_canExecute"];
                        if (msls_isFunction(userCode)) {
                            result = !!userCode.call(null, this);
                        }
                        return result;
                    };
                }
            });
        }
        msls_mixIntoExistingClass(screenClass, mixInContent);

        return screenClass;
    }

    msls_createScreen =
    function createScreen(constructor, dataWorkspace, screenArguments) {
        var screenObject;
        if (!$.isFunction(constructor) || (!!screenArguments && !$.isArray(screenArguments))) {
            return screenObject;
        }

        screenObject = Object.create(constructor.prototype);
        constructor.call(screenObject, screenArguments, dataWorkspace);

        return screenObject;
    };

    msls_initScreen =
    function initScreen(screen, dataWorkspace, modelId, screenParameters) {
        var screenClassInstance = screen,
            screenClass = screenClassInstance.constructor,
            screenDetails = screen.details,
            parameterName,
            parameterProperties,
            property,
            entity,
            entityDetails,
            entitySet,
            dataServiceDetails,
            data,
            valid = false, isLocal = false, isReference = false;

        screenDetails.dataWorkspace = dataWorkspace;
        msls_setProperty(screenDetails, "_modelId", modelId);

        var model = screenDetails.getModel();
        if (model) {
            screen.details.displayName = msls_getLocalizedString(model.displayName);
            screen.details.description = msls_getLocalizedString(model.description);
        }

        if (screenParameters && model.properties) {
            parameterProperties = msls_iterate(model.properties)
                .where(function (p) {
                    return !!msls_getAttribute(p, ":@IsParameter");
                })
                .array;

            if (screenParameters.length > parameterProperties.length) {
                msls_throwInvalidOperationError(msls_getResourceString("screen_too_many_parameter_values"));
            }

            screenParameters.forEach(function (parameterValue, index) {
                parameterName = msls_getProgrammaticName(parameterProperties[index].name);
                property = screenDetails.properties[parameterName];
                isLocal = property instanceof msls.Screen.Details.LocalProperty;
                isReference = property instanceof msls.Screen.Details.ReferenceProperty;
                if (parameterValue instanceof msls.Entity) {
                    entity = parameterValue;
                    entityDetails = entity.details;
                    entitySet = entityDetails.entitySet;

                    if (!!entitySet && !!entitySet.dataService) {
                        dataServiceDetails = entitySet.dataService.details;
                        if (!!dataWorkspace && dataServiceDetails.dataWorkspace === dataWorkspace) {
                            valid = true;
                        }
                    }
                } else {
                    valid = true;
                }
                if (valid) {
                    if (isLocal) {
                        msls_setProperty(screen, "__" + parameterName, parameterValue);
                    } else if (isReference) {
                        data = screenDetails._propertyData[parameterName];
                        data._value = parameterValue;
                        data._isLoaded = true;
                    }
                }
            });
        }
    };

    msls_initScreenDetails =
    function initScreenDetails(screenDetails, owner) {
        screenDetails.screen = owner;
        msls_setProperty(screenDetails, "_model", null);
        screenDetails.serverErrors = [];

        msls_setProperty(screenDetails, "_propertyData", {});
        $.each(screenDetails.properties.all(),function () {
            screenDetails._propertyData[this.name] = {};
        });
    };

    msls_mixIntoExistingClass(_Screen, {
        showTab: function showTab(tabName, options) {
            var beforeShown = options ? options.beforeShown : null;
            return msls.shell.showTab(tabName, null, beforeShown);
        },
        showPopup: function showPopup(popupName) {
            return msls.shell.showPopup(popupName);
        },
        closePopup: function closePopup() {
            return msls.shell.closePopup();
        },
        findContentItem: function findContentItem(contentItemName) {

            return this.details.rootContentItem.findItem(contentItemName);
        }
    });

    msls_setProperty(_Screen.prototype.showTab, "canExecute", function (tabName, options) {
        if (!!options && msls_isFunction(options.canExecute)) {
            return options.canExecute.apply(this, arguments);
        }
        return true;
    });
    msls_setProperty(_Screen.prototype.showPopup, "canExecute", function (popupName, options) {
        if (!!options && msls_isFunction(options.canExecute)) {
            return options.canExecute.apply(this, arguments);
        }
        return true;
    });

    msls_mixIntoExistingClass(_ScreenDetails, {
        displayName: msls_observableProperty(),
        description: msls_observableProperty(),
        serverErrors: msls_observableProperty(),

        saveChangesTo: msls_accessorProperty(
            function saveChangesTo_get() {
                var me = this,
                    attributes;

                if (!me._saveChangesToValue) {
                    attributes = msls_getAttributes(me.getModel(), ":@SaveChangesTo");
                    msls_setProperty(me, "_saveChangesToValue", []);
                    if (attributes) {
                        $.each(attributes, function () {
                            var pName;
                            if (!!this.property &&
                                !!(pName = this.property.name)) {
                                me._saveChangesToValue.push(me.dataWorkspace[msls_getProgrammaticName(pName)]);
                            }
                        });
                    }
                }
                return me._saveChangesToValue;
            }
        ),
        startPage: msls_accessorProperty(
            function startPage_get() {
                var attribute;

                if (!this._startPageValue) {
                    attribute = msls_getAttribute(this.getModel(), ":@StartPage");
                    if (attribute) {
                        msls_setProperty(this, "_startPageValue", this.screen.findContentItem(attribute.value));
                    } else {
                        msls_setProperty(this, "_startPageValue", this.pages[0]);
                    }
                }
                return this._startPageValue;
            }
        ),
        validate: function validate() {
            var results = [],
                dataService;

            if (!!this.saveChangesTo && this.saveChangesTo.length > 0) {
                dataService = this.saveChangesTo[0];

                if (!!dataService) {
                    var changes = dataService.details.getChanges();
                    $.each(changes, function () {
                        $.each(this.details.properties.all(), function () {
                            if (this instanceof msls.Entity.Details.StorageProperty) {
                                results = results.concat(msls_validate(this, this.value, true));
                            }
                        });
                    });
                }
            }

            return results;
        },
        rootContentItem: msls_accessorProperty(
            function rootContentItem_get() {
                if (!this._rootContentItem) {
                    var model = this.getModel();
                    msls_setProperty(this, "_rootContentItem", msls.services.contentItemService.createContentItemTree(this.screen, model.rootContentItem, null));
                }
                return this._rootContentItem;
            }
        ),
        pages: msls_accessorProperty(function pages_get() {

            var tree = this.rootContentItem,
                pageContainers,
                pages = [];

            if (!!tree && !!(pageContainers = tree.children)) {

                for (var i = 0; i < pageContainers.length; i++) {
                    pages = pages.concat(pageContainers[i].children.slice(0));
                }
            }

            return pages;
        }),
        _findModel: function findModel() {
            return msls.services.modelService.tryLookupById(this._modelId);
        },
        _onDispose: function _onDispose() {
            if (this._rootContentItem) {
                msls_dispose(this._rootContentItem);
                this._rootContentItem = null;
            }
            if (this._startPageValue) {
                this._startPageValue = null;
            }
            this._propertyData = null;
        }
    });

    function makeScreenDetails(screenClass) {
        function ScreenDetails(owner) {
            _ScreenDetails.call(this, owner);
        }
        return ScreenDetails;
    }

    msls_expose("_defineScreen", defineScreen);
    msls_expose("Screen", _Screen);

}());

var msls_createShellCommandViewModel;

(function () {

    msls_defineClass(msls, "ShellCommandViewModel",
        function ShellCommandViewModel(command, displayName, name) {

            this.command = command;
            this.displayName = displayName;
            this.name = name;
        },
        null,
        {
        }
    );

    msls_createShellCommandViewModel =
        function createShellCommandViewModel(bindingPath, bindingSource, boundArguments, displayName, name) {
            var boundCommand = new msls.BoundCommand(bindingPath, bindingSource, boundArguments),
                viewModel = new msls.ShellCommandViewModel(boundCommand, displayName, name);

            msls_addLifetimeDependency(viewModel, boundCommand);
            return viewModel;
        };

}());

(function () {

    var msls_builtIn_screenTypeProperty = msls_getControlPropertyId("ScreenType", "Screen");

    msls_defineClass(msls, "NavigationUnit",
        function NavigationUnit(shell) {


            this.shell = shell;
            this._pageUiControls = [];
        }, null, {
            boundaryOption: msls_BoundaryOption.none,
            popup: false,
            nestedChangeSet: null,
            dialogTitle: msls_observableProperty(),
            pageName: msls_observableProperty(),

            isBrowseMode:
                function isBrowseMode() {
                    var me = this;
                    return !me.isPopupPage &&
                        me.screen.details.rootContentItem
                            .properties[msls_builtIn_screenTypeProperty] === "Browse";
                },

            hasChanges: msls_accessorProperty(function () {
                var boundary = this.boundaryOption;
                if (boundary === msls_BoundaryOption.save) {
                    return this.screen.details.dataWorkspace.details.hasChanges;
                } else if (boundary === msls_BoundaryOption.nested) {
                    return !!this.nestedChangeSet && this.nestedChangeSet.hasNestedChanges;
                } else {
                    return false;
                }
            }),

            registerPageUiControl: function registerPageUiControl(object) {
                this._pageUiControls.push(object);
            },

            cleanPageUiControls: function cleanPageUiControls() {
                this._pageUiControls.forEach(msls_dispose);
                this._pageUiControls = [];
            },

            _onDispose: function _onDispose() {
                var me = this;
                me.cleanPageUiControls();
                me.contentItemTree = null;
                me.screen = null;
                me.task = null;
            }
        }
    );

    msls_defineClass(msls, "TaskViewModel",
        function TaskViewModel(shell, screenObject, taskBoundaryOption) {

            this.shell = shell;
            this.screen = screenObject;
            this.taskBoundaryOption = taskBoundaryOption;
        }, null, {
            screenTitle: msls_observableProperty(),

            _onDispose:
            function _onDispose() {
                var me = this,
                    commands = me.tabCommands,
                    i, len;
                if (commands) {
                    commands.forEach(msls_dispose);
                    me.tabCommands = null;
                }
                me.screen = null;
            }
        }
    );

}());

var msls_shell,
    msls_shell_activeNavigationUnitChangedNotification = "activeNavigationUnitChanged",
    msls_dispatchApplicationSaveChangesEvent,
    msls_shellCommandStartNotification = "shellCommandStart",
    msls_shellCommandCompleteNotification = "shellCommandComplete";

(function () {

    var defaultNavigateBackOption = msls_NavigateBackOption.beforeSaveBoundary,
        alreadyNavigatingError = "AlreadyNavigatingError",
        canceledName = "Canceled";


    function initialize(applicationDefinition, homeScreenId) {

        var me = this;


        me.saveCommand = msls_createShellCommandViewModel(
            "commitChanges",
            this,
            null,
            msls_getResourceString("shell_saveChanges_btn"),
            "save");

        me.discardCommand = msls_createShellCommandViewModel(
            "cancelChanges",
            this,
            null,
            msls_getResourceString("shell_discardChanges_btn"),
            "discard");

        me.okCommand = msls_createShellCommandViewModel(
            "commitChanges",
            this,
            null,
            msls_getResourceString("shell_acceptNested_btn"),
            "ok");

        me.cancelCommand = msls_createShellCommandViewModel(
            "cancelChanges",
            this,
            null,
            msls_getResourceString("shell_cancelNested_btn"),
            "cancel");

        me.backCommand = msls_createShellCommandViewModel(
            "navigateBack",
            this,
            null,
            msls_getResourceString("shell_back_btn"),
            "back");

        me.closeCommand = msls_createShellCommandViewModel(
            "navigateBack",
            this,
            null,
            msls_getResourceString("shell_close_btn"),
            "close");

        me.logoutCommand = msls_createShellCommandViewModel(
            "logout",
            this,
            null,
            msls_getResourceString("shell_logout_btn"),
            "logout");

        applicationDefinition = applicationDefinition || msls_getApplicationDefinition();
        if (homeScreenId) {
            me._homeScreen = msls.services.modelService.tryLookupById(homeScreenId);
        }
        if (!me._homeScreen) {
            me._homeScreen = applicationDefinition ? applicationDefinition.homeScreen : null;
        }
        if (!me._homeScreen) {
            return WinJS.Promise.wrapError(
                msls_getResourceString("shellViewModel_noHomeScreen"));
        }
        me.logoPath = msls_rootUri + applicationDefinition.logo;

        me.beforeFirstPageNavigationUnit = new msls.NavigationUnit(me);
        me.beforeFirstPageNavigationUnit.boundaryOption = msls_BoundaryOption.none;
        me.beforeFirstPageNavigationUnit.index = -1;

        return me._startNavigationOperation(null, function (operation) {
            var homeUnit = _prepareNavigationUnit(me, {
                screenDefinition: me._homeScreen,
                boundaryOption: msls_BoundaryOption.save
            });
            _resolveWhenPromiseComplete(operation,
            _navigateView(me, homeUnit, false));
        });
    }

    function finishNavigation() {

        var me = this;

        if (me._currentNavigationOperation) {
            return me._currentNavigationOperation.promise();
        } else {
            return msls_promiseOperation(function initFinishNavigation(operation) {
                msls_dispatch(operation.code(function () {
                    if (me._currentNavigationOperation) {
                        _resolveWhenPromiseComplete(operation, me._currentNavigationOperation.promise());
                    } else {
                        operation.complete();
                    }
                }));
            });
        }
    }

    function showScreen(screenIdOrDefinition, screenArguments, pageName, popup, beforeShown, afterClosed) {


        var modelService = msls.services.modelService,
            screenId,
            screenDefinition,
            activeNavigationUnit = this.activeNavigationUnit,
            boundaryOption;


        if (typeof screenIdOrDefinition === "string") {
            screenId = screenIdOrDefinition;
        } else {
            screenDefinition = screenIdOrDefinition;
        }

        boundaryOption = activeNavigationUnit.isBrowseMode() &&
                activeNavigationUnit.boundaryUnit.boundaryOption === msls_BoundaryOption.save ?
            msls_BoundaryOption.save : msls_BoundaryOption.nested;

        popup = !!popup;


        var loadOptions = {
            screenId: screenId,
            screenDefinition: screenDefinition,
            pageName: pageName,
            screenArguments: screenArguments,
            boundaryOption: boundaryOption,
            popup: popup,
            beforeShown: beforeShown,
            afterClosed: afterClosed
        };
        return _showScreenOrPageCore(this, loadOptions);
    }

    function showPopup(popupName) {

        msls_mark(msls_codeMarkers.getPopupContentStart);

        var options = msls_currentActionData,
            screenObject = this.activeNavigationUnit.screen;

        var rootContentItem = _getPageContentItemRoot(screenObject, popupName, true);

        _hookUpContentItemTreeData(rootContentItem, screenObject);

        rootContentItem._activate();
        msls_mark(msls_codeMarkers.getPopupContentEnd);

        return this.shellView.showPopup(rootContentItem, function onPopupClose() {
            rootContentItem._deactivate();
            },
            options);

    }

    function closePopup() {
        return this.shellView.closePopup();
    }

    function showTab(tabName, boundaryOption, beforeShown) {

        var me = this;

        if (tabName === me.activeNavigationUnit.pageName) {
            return _createDeferredResolution();
        }

        var pageRoot = _getPageContentItemRoot(me.activeNavigationUnit.screen, tabName, false),
            pageKind = pageRoot.pageKind,
            defaultBoundary =
                pageKind === msls_PageKind.popup ? msls_BoundaryOption.nested :
                msls_BoundaryOption.none;

        boundaryOption = typeof boundaryOption === "string" ? boundaryOption : defaultBoundary;

        var loadOptions = {
            screen: me.activeNavigationUnit.screen,
            pageName: tabName,
            boundaryOption: boundaryOption,
            popup: false,
            beforeShown: beforeShown,
            isShowTab: true
        };
        return _showScreenOrPageCore(me, loadOptions);
    }

    function validateActivePage(onCompletion) {

        _validatePageUI(this, this.activeNavigationUnit, onCompletion);
    }

    function applyChanges() {
        var me = this,
            navigateBackOption = msls_NavigateBackOption.none;
        if (me.canApplyNestedChanges) {
            return me.applyNestedChanges(navigateBackOption);
        } else {
            return me.saveChanges(navigateBackOption);
        }
    }

    function commitChanges() {
        var me = this,
            navigateBackOption = msls_NavigateBackOption.beforeSaveBoundary;
        if (me.canApplyNestedChanges) {
            return me.applyNestedChanges(navigateBackOption);
        } else {
            return me.saveChanges(navigateBackOption);
        }
    }

    function cancelChanges() {
        var me = this;
        if (me.canCancelNestedChanges) {
            return me.cancelNestedChanges();
        } else {
            return me.discardChanges(msls_NavigateBackOption.beforeSaveBoundary);
        }
    }

    function saveChanges(navigateBackOption) {

        var me = this;

        if (!me.canSaveChanges) {
            _throwCannotExecute();
        }

        navigateBackOption = _determineNavigateBackOptionForSaveDiscard(me, navigateBackOption);

        return me._startNavigationOperation("saveChanges", function (operation) {
            var delay = 1;


            msls_setTimeout(function () {
                _validateBeforeSave(me, operation, function () {
                    var navigationDescription = _createCommitOrCancelNavigationDescription(me),
                        navigationTarget = _determineTargetForSaveOrDiscard(me, navigateBackOption);
                    _resolveWhenPromiseComplete(operation,
                        _processNavigationDescription(me, navigationDescription, true, navigationTarget));
                });
            }, delay);
        });
    }
    saveChanges.canExecute = function (navigateBackOption) {
        return this.canSaveChanges;
    };

    function discardChanges(navigateBackOption) {

        var me = this;

        if (!this.canDiscardChanges) {
            _throwCannotExecute();
        }

        navigateBackOption = _determineNavigateBackOptionForSaveDiscard(me, navigateBackOption);

        return me._startNavigationOperation(null, function (operation) {
            msls_setTimeout(operation.code(function () {
                var currentUnit = me.activeNavigationUnit,
                    navigationDescription = _createCommitOrCancelNavigationDescription(me),
                    navigationTarget = _determineTargetForSaveOrDiscard(me, navigateBackOption);
                _resolveWhenPromiseComplete(operation,
                    _processNavigationDescription(me, navigationDescription, false, navigationTarget));
            }), 1);
        });
    }
    discardChanges.canExecute = function (navigateBackOption) {
        return this.canDiscardChanges;
    };

    function applyNestedChanges(navigateBackOption) {

        if (!this.canApplyNestedChanges) {
            _throwCannotExecute();
        }

        var me = this;
        return me._startNavigationOperation(null, function (operation) {
            me.validateActivePage(operation.code(function (error) {
                if (error) {
                    operation.error(error);
                } else {
                    var target = _determineTargetForApplyOrCancel(me, navigateBackOption);
                    var navigationDescription = _createCommitOrCancelNavigationDescription(me);
                    if (navigateBackOption === msls.NavigateBackOption.none) {
                        navigationDescription.onlyApplyNestedChanges = true;
                    }
                    _resolveWhenPromiseComplete(operation,
                        _processNavigationDescription(me, navigationDescription, true, target));
                }
            }));

        });
    }
    applyNestedChanges.canExecute = function () {
        return this.canApplyNestedChanges;
    };

    function cancelNestedChanges() {

        if (!this.canCancelNestedChanges) {
            _throwCannotExecute();
        }

        var me = this;
        return me._startNavigationOperation(null, function (operation) {
            var target = _determineTargetForApplyOrCancel(me),
                navigationDescription = _createBackwardNavigationDescription(me, me.activeNavigationUnit, target, false);
            _resolveWhenPromiseComplete(operation,
                _processNavigationDescription(me, navigationDescription, false, target));
        });
    }
    cancelNestedChanges.canExecute = function () {
        return this.canCancelNestedChanges;
    };

    function navigateHome() {

        return this.activeNavigationUnit.index > 0 ? this.navigateBack(this.activeNavigationUnit.index) : _createDeferredResolution();
    }
    navigateHome.canExecute = function () {
        return this.canNavigateHome;
    };

    function navigateBack(distance) {

        var me = this;

        distance = distance || 1;
        var currentIndex = me.activeNavigationUnit.index,
            newIndex = currentIndex - distance;
        if (distance <= 0 || newIndex < 0) {
            msls_throwArgumentError(null, distance, "distance");
        }

        var targetNavigationUnit = me.navigationStack[newIndex];

        return me._startNavigationOperation(null, function (operation) {
            _resolveWhenPromiseComplete(operation,
                me._requestNavigateBack(targetNavigationUnit));
        });
    }

    function _requestNavigateBack(navigationUnit) {

        var me = this;

        if (navigationUnit === this.activeNavigationUnit) {
            return;
        }


        return msls_promiseOperation(function initRequestNavigateBack(operation) {
            var navigationDescription = _createBackwardNavigationDescription(me, me.activeNavigationUnit, navigationUnit, false);
            _askAndProcessNavigation(me, navigationDescription, navigationUnit)
            .then(function success() {
                msls_dispatch(function () {
                    operation.complete();
                });
            }, function fail(result) {
                operation.error(result || msls_getResourceString("command_exec_err"));
            });
        });
    }

    function synchronizeAfterBrowserNavigation(targetUnit) {

        var me = this;

        if (!targetUnit || targetUnit === this.activeNavigationUnit) {

            return new WinJS.Promise(function (success) { success(); });
        } else {


            var navigationDescription = _createBackwardNavigationDescription(me, me.activeNavigationUnit, targetUnit, true);
            return _processNavigationDescription(me, navigationDescription, false, targetUnit);
        }
    }

    function logout() {

        this.shellView.logout();
    }
    logout.canExecute = function () {


        var me = this;

        return me._isFormsAuthEnabled;
    };

    function anyNavigationUnitHasChanges() {

        for (var id in this.navigationStack) {
            if (this.navigationStack[id].hasChanges) {
                return true;
            }
        }
        return false;
    }




    function _throwCannotExecute() {
        msls_throwError("CannotExecuteError", msls_getResourceString("command_cannot"));
    }

    function _complete(onCompletion, error) {

        if (onCompletion) {
            onCompletion(error || null);
        }
    }

    function _resolveWhenPromiseComplete(operation, promise) {
        promise
        .then(
            function success(result) {
                operation.complete(result);
            },
            function fail(error) {
                operation.error(error);
            });
    }

    function _startNavigationOperation(notificationName, code) {
        msls_mark(msls_codeMarkers.navigationStart);

        var me = this;
        if (me._currentNavigationOperation) {
            msls_throwError("AlreadyNavigatingError", msls_getResourceString("shell_already_nav"));
        }

        return msls_promiseOperation(function initNavigationOperation(operation) {
            me.shellView.commitActiveElement();
            if (notificationName) {
                msls_notify(msls_shellCommandStartNotification, { name: notificationName });
            }
            me._currentNavigationOperation = operation;
            code(operation);
            code = null;
        })._thenEx(function (error) {
            me._currentNavigationOperation = null;
            if (notificationName) {
                msls_notify(msls_shellCommandCompleteNotification, { name: notificationName, error: error });
            }
            if (error) {
                throw error;
            }
        });
    }

    function _createDeferredResolution(result) {
        return msls_promiseOperation(function (operation) {
            msls_dispatch(function () { operation.complete(result); });
        });
    }

    function _findNavigationUnitWithIndex(me, index) {
        return me.navigationStack[index];
    }

    function _findPreviousNavigationUnit(me, navigationUnit) {

        if (navigationUnit.index > 0) {
            var before = _findNavigationUnitWithIndex(me, navigationUnit.index - 1);
            return before;
        }

        return null;
    }

    function _findCurrentSaveBoundary(me) {

        var saveUnits = me.findNavigationUnits(
            function (navUnit) {
                return (navUnit.boundaryOption === msls_BoundaryOption.save);
            }),
        lastSaveBoundaryUnit = (saveUnits.length ?
            saveUnits.pop() :
            me.navigationStack[0]);

        return lastSaveBoundaryUnit;
    }

    function findNavigationUnits(filter) {

        var units = [];

        for (var i = 0; i in this.navigationStack; i++) {
            var navigationUnit = this.navigationStack[i];
            if (!filter || filter(navigationUnit)) {
                units.push(navigationUnit);
            }
        }

        return units;
    }

    function _processArrayWithErrorHandling(array, elementFunction) {

        return msls_promiseOperation(function (operation) {

            function recursiveProcessHelper(elementArray) {
                if (elementArray.length === 0) {
                    operation.complete();
                } else {
                    var element = elementArray[0];
                    var error = null;
                    var remaining = elementArray.slice(1);

                    try {
                        elementFunction(element, operation.code(function (functionError) {
                            error = functionError;

                            if (error) {
                                operation.error({ error: error, errorElement: element });
                            } else {
                                recursiveProcessHelper(remaining);
                            }
                        }));
                    } catch (ex) {
                        operation.error({ error: ex, errorElement: element });
                    }
                }
            }

            recursiveProcessHelper(array);
        });
    }
    function _resolveScreenDefinitionInLoadOptions(me, loadOptions) {
        if (!!loadOptions.screenId && !loadOptions.screenDefinition) {
            loadOptions.screenDefinition = msls.services.modelService.tryLookupById(loadOptions.screenId);
            if (!loadOptions.screenDefinition) {
                throw msls_getResourceString("shell_invalid_1args", loadOptions.screenId);
            }
        }
    }

    function _prepareNavigationUnit(me, loadOptions) {

        var
        options = $.extend({}, _prepareNavigationUnit.defaults, loadOptions),
        showAsDialog = !!options.popup,
        isShowTab = !!options.isShowTab,
        _ScreenType,
        screenObject,
        pageModelId,
        pageModel,
        boundaryOption = options.boundaryOption;

        msls_mark(msls_codeMarkers.loadScreenStart);

        if (options.screen) {
            screenObject = options.screen;
        } else {

            var dataWorkspace = me.activeNavigationUnit ? me.activeNavigationUnit.screen.details.dataWorkspace : null;

            _ScreenType = window.msls.application[options.screenDefinition.name];

            screenObject = msls_createScreen(_ScreenType, dataWorkspace, options.screenArguments);
        }

        var contentItemTree = _getPageContentItemRoot(screenObject, options.pageName, false);

        contentItemTree.isVisible = true;

        var task = msls_iterate(
            msls_getValues(me.navigationStack)
                .map(function (unitItem) {
                    return unitItem.task;
                })
            ).first(function (taskItem) {
                return taskItem.screen === screenObject;
            });
        if (!task) {
            task = _createTaskViewModel(me, screenObject, boundaryOption);
        }

        var unit;
        if (isShowTab) {

            unit = me.activeNavigationUnit;

            if (unit.contentItemTree) {
                unit.contentItemTree._deactivate();
            }
            contentItemTree._activate();

            unit.contentItemTree = contentItemTree;
            unit.pageName = contentItemTree.name;
        } else {
            unit = new msls.NavigationUnit(me);
            var currentIndex = me.activeNavigationUnit ?
                    me.activeNavigationUnit.index :
                    -1,
                newIndex = currentIndex + 1;
            unit.index = newIndex;
            unit.boundaryOption = boundaryOption;
            unit.popup = showAsDialog;
            unit.popupDepth = (me.activeNavigationUnit ? me.activeNavigationUnit.popupDepth : 0) +
                (showAsDialog ? 1 : 0);
            unit.screen = screenObject;
            unit.contentItemTree = contentItemTree;
            unit.pageName = contentItemTree.name;
            unit.task = task;
            if (boundaryOption === msls_BoundaryOption.none) {
                if (me.activeNavigationUnit) {
                    unit.boundaryUnit = me.activeNavigationUnit.boundaryUnit;
                }
            } else {
                unit.boundaryUnit = unit;
            }

            if (showAsDialog) {
                var binding = (new msls.data.DataBinding("screenTitle", unit.task, "dialogTitle", unit,
                        msls_data_DataBindingMode.oneWayFromSource));
                binding.bind();
            }

            me.navigationStack[newIndex] = unit;

            if (boundaryOption === msls_BoundaryOption.nested) {
                unit.nestedChangeSet = msls_DataWorkspace_beginNestedChanges(screenObject.details.dataWorkspace);
            }

            unit.afterClosed = options.afterClosed;
        }

        if (options.beforeShown) {
            options.beforeShown.call(screenObject, screenObject);
        }

        if (!!_ScreenType && !!_ScreenType.created) {
            _ScreenType.created.call(null, screenObject);
        }

        _hookUpContentItemTreeData(contentItemTree, screenObject);

        msls_mark(msls_codeMarkers.loadScreenEnd);

        return unit;
    }
    _prepareNavigationUnit.defaults = {
        screenId: null,
        screenDefinition: null,
        screen: null,
        pageName: null,
        prepend: false,
        screenArguments: []
    };

    function _hookUpContentItemTreeData(contentItemTree, screenObject) {
        if (contentItemTree.data !== screenObject) {
            contentItemTree.data = screenObject;
            contentItemTree.screen = screenObject;
        }
    }

    function _showScreenOrPageCore(me, loadOptions) {

        var activeNavigationUnit = me.activeNavigationUnit,
            screenObject,
            i,
            isShowScreen = !loadOptions.isShowTab;

        _resolveScreenDefinitionInLoadOptions(me, loadOptions);

        if (isShowScreen) {

            var screenDefinition = loadOptions.screen ?
                        loadOptions.screen.details.getModel() :
                        loadOptions.screenDefinition,
                screenPropertySources = screenDefinition.rootContentItem.propertySources,
                showAsDialogPropertyValue;
            if (screenPropertySources) {
                for (i = 0; i < screenPropertySources.length; i++) {
                    if (screenPropertySources[i].property.name === "ShowAsDialog") {
                        var value = screenPropertySources[i].value;
                        if (typeof value === "boolean" && value) {
                            showAsDialogPropertyValue = true;
                            break;
                        }
                    }
                }
            }
            if (showAsDialogPropertyValue) {
                loadOptions.popup = true;
            }
            if (!loadOptions.isShowTab && !!me.activeNavigationUnit && me.activeNavigationUnit.popupDepth) {
                loadOptions.popup = true;
            }
            if (!me.activeNavigationUnit) {
                loadOptions.popup = false;
            }
            if (!msls_appOptions.enableModalScrollRegions) {
                loadOptions.popup = false;
            }
        }

        return me._startNavigationOperation(null, function (operation) {

            var navigationDescription = _createForwardNavigationDescription(me, me.activeNavigationUnit, loadOptions.boundaryOption);

            _askAndProcessNavigation(me, navigationDescription, null)
            ._thenEx(function (error, result) {
                if (error) {
                    operation.error(error);
                } else {

                    var navigationUnit = _prepareNavigationUnit(me, loadOptions);
                    _resolveWhenPromiseComplete(operation,
                        _navigateView(me, navigationUnit, false));
                }
            })
            .then(null, function (error) {
                operation.error(error);
            });
        });
    }

    function _getPageContentItemRoot(screenObject, pageName, isPopupPage) {

        var contentItemTree;
        if (pageName) {
            contentItemTree = screenObject.findContentItem(pageName);
            var validPageName = false;
            if (contentItemTree) {
                switch (contentItemTree.pageKind) {
                    case msls_PageKind.tab:
                        validPageName = !isPopupPage;
                        break;

                    case msls_PageKind.popup:
                        validPageName = isPopupPage;
                        break;


                    case msls_PageKind.none:
                        break;
                }
            }

            if (!validPageName) {
                msls_throwError(isPopupPage ? "PopupNotFoundError" : "TabNotFoundError",
                    msls_getResourceString(isPopupPage ? "shell_popupnotfound_2args" : "shell_tabnotfound_2args",
                        pageName, screenObject.details.getModel().name));
            }
        } else {
            contentItemTree = screenObject.details.startPage;
        }

        return contentItemTree;
    }

    function _preProcessNavigationUnitChanges(me, navigationUnit, navigationDescription, accept, onCompletion) {
        if (!navigationDescription.isBackward || !accept) {
            _complete(onCompletion);
            return;
        }

        var screenObject = navigationUnit.screen,
            constructorName = "constructor",
            _ScreenType = screenObject[constructorName],
            beforeApplyChanges = _ScreenType.beforeApplyChanges,
            result;

        if (!beforeApplyChanges) {
            _complete(onCompletion);
            return;
        }

        try {
            result = beforeApplyChanges.call(null, screenObject);
        } catch (error) {
            _complete(onCompletion, error);
        }
        if (result === false) {
            _complete(onCompletion, new WinJS.ErrorFromName(canceledName));
        } else if (WinJS.Promise.is(result)) {
            result._thenEx(function (asyncError, asyncResult) {
                if (asyncError) {
                    _complete(onCompletion, asyncError);
                } else if (asyncResult === false) {
                    _complete(onCompletion, new WinJS.ErrorFromName(canceledName));
                } else {
                    _complete(onCompletion);
                }
            });
        } else {
            _complete(onCompletion);
        }
    }

    function _processNavigationUnitChanges(me, navigationUnit, navigationDescription, accept, onCompletion) {

        if (navigationDescription.isBackward && navigationUnit.boundaryOption === msls_BoundaryOption.nested) {
            var changeSet = navigationUnit.nestedChangeSet;
            if (changeSet) {
                if (accept) {
                    if (navigationDescription.onlyApplyNestedChanges) {
                        changeSet.applyNestedChanges();
                    } else {
                        changeSet.commitNestedChanges();
                    }
                } else {
                    changeSet.cancelNestedChanges();
                }


                if (!navigationDescription.onlyApplyNestedChanges) {
                    navigationUnit.nestedChangeSet = null;
                }
            }

            navigationUnit.contentItemTree._alwaysShowValidationResults = false;

            if (!accept) {
                navigationUnit.contentItemTree._refreshStringValue();
            }
            _complete(onCompletion);

        } else {
            var thisUnitCrossesSaveBoundary = (navigationDescription.isForward && navigationDescription.crossesSaveBoundary) ||
                (navigationDescription.isBackward && navigationUnit.boundaryOption === msls_BoundaryOption.save);
            if (thisUnitCrossesSaveBoundary) {
                var workspaceDetails = navigationUnit.screen.details.dataWorkspace.details;


                if (accept) {
                    _saveChangesToDataWorkspace(me, navigationUnit, function (error) {

                        if (!error) {
                            navigationUnit.contentItemTree._alwaysShowValidationResults = false;
                        }

                        _complete(onCompletion, error);
                    });
                } else {
                    _discardChangesToDataWorkspace(me, navigationUnit);

                    navigationUnit.contentItemTree._alwaysShowValidationResults = false;

                    navigationUnit.contentItemTree._refreshStringValue();
                    _complete(onCompletion);
                }
            } else {
                if (!accept) {
                    navigationUnit.contentItemTree._refreshStringValue();
                }
                _complete(onCompletion);
            }
        }
    }

    function _processNavigationDescription(me, navigationDescription, accept, targetNavigationUnit) {


        function tryCallAfterClosed(afterClosed, screenObject) {
            if (afterClosed) {
                try {
                    afterClosed.call(screenObject, screenObject, !accept ?
                        msls_NavigateBackAction.cancel : msls_NavigateBackAction.commit);
                } catch (e) { }
            }
        }

        return msls_promiseOperation(function (operation) {
            var navigationUnits = navigationDescription.navigationUnitsCrossedOver.reverse(),
                pendingAfterClosed,
                pendingAfterClosedScreen;

            _processArrayWithErrorHandling(navigationUnits, function (element, onSingleElementCompletion) {
                _preProcessNavigationUnitChanges(me, element, navigationDescription, accept, function (completionError) {
                    onSingleElementCompletion(completionError);
                });
            })
            ._thenEx(function (error) {
                var error2 = error && error.error;
                if (error2) {
                    if (error2.name === canceledName) {
                        error2 = {
                            userCanceled: true, noErrorDialog: true
                        };
                    }
                    _completeOrFailOperation(operation, error2);
                    return true;
                }

                return _processArrayWithErrorHandling(navigationUnits, function (element, onSingleElementCompletion) {
                    _processNavigationUnitChanges(me, element, navigationDescription, accept, function (completionError) {
                        if (navigationDescription.isBackward) {
                            if (element !== navigationUnits[navigationUnits.length - 1]) {
                                tryCallAfterClosed(element.afterClosed, element.screen);
                            } else {
                                pendingAfterClosed = element.afterClosed;
                                pendingAfterClosedScreen = element.screen;
                            }
                        }
                        onSingleElementCompletion(completionError);
                    });
                });
            })
            ._thenEx(function (error, result) {
                if (result) {
                    return;
                }

                var error2 = null;
                if (error && error.error) {
                    if (targetNavigationUnit) {
                        targetNavigationUnit = error.errorElement;
                    }
                    error2 = error.error || msls_getResourceString("shell_unknown_save");
                }

                if (navigationDescription.isForward) {
                    $.each(navigationDescription.navigationUnitsCrossedOver, function (id, unit) {
                        if (unit.boundaryOption === msls_BoundaryOption.nested && !unit.nestedChangeSet) {
                            unit.nestedChangeSet = msls_DataWorkspace_beginNestedChanges(unit.screen.details.dataWorkspace);

                        }
                    });
                }

                if (!!targetNavigationUnit &&
                    targetNavigationUnit !== me.activeNavigationUnit) {
                    _navigateView(me, targetNavigationUnit, navigationDescription.isBrowserMode)
                    ._thenEx(function (navigationError) {
                        if (navigationError && !error2) {
                            error2 = navigationError;
                        }
                        _completeOrFailOperation(operation, error2);
                        if (pendingAfterClosed) {
                            msls_dispatch(function () {
                                msls_promiseOperation(function (closeOperation) {
                                    tryCallAfterClosed(
                                        pendingAfterClosed,
                                        pendingAfterClosedScreen);
                                    closeOperation.complete();
                                }, true);
                            });
                        }
                    });
                } else {
                    _completeOrFailOperation(operation, error2);
                }
            });
        });
    }

    function _saveChangesToDataWorkspace(me, navigationUnit, onCompletion) {

        var screenDetails = navigationUnit.screen.details,
            dataWorkspaceDetails = screenDetails.dataWorkspace.details,
            saveChangesPromise,
            dataServiceProperties,
            dataServiceProperty,
            dataServiceWithChanges;
        if (!dataWorkspaceDetails.hasChanges) {
            _complete(onCompletion);
            return;
        }

        saveChangesPromise = msls_dispatchApplicationSaveChangesEvent();
        if (!saveChangesPromise) {
            dataServiceProperties = dataWorkspaceDetails.properties.all();
            for (var i = 0, len = dataServiceProperties.length; i < len; i++) {
                dataServiceProperty = dataServiceProperties[i];
                if (dataServiceProperty.value.details.hasChanges) {
                    if (dataServiceWithChanges) {
                        _complete(onCompletion, {
                            title: msls_getResourceString("screen_save_failed"),
                            message: msls_getResourceString("screen_save_multiple_data_sources")
                        });
                        return;
                    }
                    dataServiceWithChanges = dataServiceProperty.value;
                }
            }
            saveChangesPromise = dataServiceWithChanges.saveChanges();
        }

        saveChangesPromise._thenEx(function (serverErrors) {
            var succeeded = !serverErrors,
                validationResults = [],
                errorMessage = "",
                validationResult,
                error;

            if (!succeeded) {
                $.each(serverErrors, function (index, serverError) {
                    if (index > 0) {
                        errorMessage += "\r\n";
                    }
                    errorMessage += serverError.message;
                    validationResult = serverError.validationResult;
                    if (validationResult) {
                        validationResults.push(validationResult);
                    }
                });
                error = {
                    title: msls_getResourceString("screen_save_failed"),
                    message: errorMessage
                };
            }

            if (!(screenDetails.serverErrors.length === 0 && validationResults.length === 0)) {
                screenDetails.serverErrors = validationResults;
            }

            if (succeeded) {
                navigationUnit.contentItemTree._alwaysShowValidationResults = false;
            }

            _complete(onCompletion, error);
        }).then(null, function (error) {
            _complete(onCompletion, error);
        });
    }

    function _discardChangesToDataWorkspace(me, navigationUnit) {

        var screenDetails = navigationUnit.screen.details,
            dataWorkspaceDetails = screenDetails.dataWorkspace.details,
            dataServiceProperties = dataWorkspaceDetails.properties.all(),
            currentDataServiceDetails;

        for (var i = 0, len = dataServiceProperties.length; i < len; i++) {
            currentDataServiceDetails = dataServiceProperties[i].value.details;
            if (currentDataServiceDetails.hasChanges) {
                currentDataServiceDetails.discardChanges();
            }
        }
    }

    function _validateBeforeSave(me, operation, callback) {
        var currentUnit = me.activeNavigationUnit;

        _validatePageUI(me, currentUnit, operation.code(function (error) {
            if (error) {
                operation.error(error);
            } else {
                _validateScreenData(me, currentUnit.screen, operation.code(function (validationError) {
                    if (validationError) {
                        operation.error(validationError);
                    } else {
                        callback();
                    }
                }));
            }
        }));
    }

    function _createCommitOrCancelNavigationDescription(me) {
        var boundaryUnit = me.activeNavigationUnit.boundaryUnit;

        var navigationDescriptionTarget = null;
        if (boundaryUnit.index === 0) {
            navigationDescriptionTarget = me.beforeFirstPageNavigationUnit;
        } else {
            navigationDescriptionTarget = _findPreviousNavigationUnit(me, boundaryUnit);
        }

        return _createBackwardNavigationDescription(me, me.activeNavigationUnit, navigationDescriptionTarget, false);
    }

    function _validatePageUI(me, navigationUnit, onCompletion) {

        var rootContentItem = navigationUnit.contentItemTree,
            error = msls_getResourceString("shell_validation_errors");

        rootContentItem.validate(true);
        if (rootContentItem.hasValidationErrors(true)) {
            rootContentItem._alwaysShowValidationResults = true;
            _complete(onCompletion, error);
        } else {
            _complete(onCompletion);
        }
    }

    function _validateScreenData(me, screenObject, onCompletion) {

        var errors = screenObject.details.validate(),
            rootContentItem = screenObject.details.rootContentItem;


        if (errors.length > 0) {
            var errorMessages = [];
            $.each(errors, function () {
                errorMessages.push(this.property.name + ": " + this.message);
            });
            var dialogMessage = errorMessages.join("\r\n");
            _complete(onCompletion, dialogMessage);
        } else {
            _complete(onCompletion);
        }
    }

    function _anyEntitiesHaveEdits(entities) {
        return msls_iterate(entities).any(function () {
            return this.details.hasEdits;
        });
    }

    function _needPermissionToNavigateBack(sourceUnit) {

        var dataWorkspace, nestedChangeSet;

        switch (sourceUnit.boundaryOption) {
            case msls_BoundaryOption.save:
                dataWorkspace = sourceUnit.screen.details.dataWorkspace;
                return dataWorkspace.details.hasChanges &&
                    _anyEntitiesHaveEdits(dataWorkspace.details.getChanges());

            case msls_BoundaryOption.nested:
                nestedChangeSet = sourceUnit.nestedChangeSet;
                return !!nestedChangeSet && nestedChangeSet.hasNestedChanges &&
                    _anyEntitiesHaveEdits(nestedChangeSet.getNestedChanges());

            default:
                return false;
        }
    }

    function _needPermissionToNavigateForward(sourceUnit, crossesSaveBoundary) {

        if (crossesSaveBoundary) {
            if (sourceUnit.screen.details.dataWorkspace.details.hasChanges) {
                return true;
            }
        }

        return false;
    }

    function _mustAskToNavigate(me, navigationDescription) {

        if (navigationDescription.isForward) {

            return _needPermissionToNavigateForward(navigationDescription.sourceNavigationUnit,
                navigationDescription.crossesSaveBoundary);
        } else {
            for (var i = 0; i < navigationDescription.navigationUnitsCrossedOver.length; i++) {
                if (_needPermissionToNavigateBack(navigationDescription.navigationUnitsCrossedOver[i])) {
                    return true;
                }
            }

            return false;
        }
    }
    function _askAndProcessNavigation(me, navigationDescription, targetNavigationUnit) {

        if (!_mustAskToNavigate(me, navigationDescription)) {
            if (navigationDescription.isBackward) {
                return _processNavigationDescription(me, navigationDescription, false, targetNavigationUnit);
            } else {
                return _createDeferredResolution();
            }
        }

        var dialogServiceOptions;

        if (navigationDescription.crossesSaveBoundary) {
            dialogServiceOptions = {
                message: msls_getResourceString("shell_save_message"),
                title: msls_getResourceString("shell_save_title"),
                buttons: [
                    {
                        text: msls_getResourceString("shell_save_btn"), icon: "check", result: msls_modal_DialogResult.yes
                    },
                    {
                        text: msls_getResourceString("shell_discard_btn"), icon: "delete", result: msls_modal_DialogResult.no
                    },
                    {
                        text: msls_getResourceString("shell_stay_btn"), icon: "back", result: msls_modal_DialogResult.cancel
                    }],
            };
        } else {
            dialogServiceOptions = {
                message: msls_getResourceString("shell_apply_message"),
                title: msls_getResourceString("shell_apply_title"),
                buttons: [
                    {
                        text: msls_getResourceString("shell_apply"), icon: "check", result: msls_modal_DialogResult.yes
                    },
                    {
                        text: msls_getResourceString("shell_discard_btn"), icon: "delete", result: msls_modal_DialogResult.no
                    },
                    {
                        text: msls_getResourceString("shell_stay_btn"), icon: "back", result: msls_modal_DialogResult.cancel
                    }],
            };
        }
        dialogServiceOptions.defaultResult = msls_modal_DialogResult.cancel;

        var keepChanges,
            stayOnPage = false;

        return msls_promiseOperation(function (operation) {
            msls_modal.show(dialogServiceOptions).then(function (result) {

                function saveOrDiscard() {
                    _resolveWhenPromiseComplete(operation, _processNavigationDescription(me, navigationDescription, keepChanges, targetNavigationUnit));
                }

                if (result === msls_modal_DialogResult.yes || result === msls_modal_DialogResult.no) {

                    keepChanges = result === msls_modal_DialogResult.yes ? true : false;

                    if (keepChanges) {
                        _validateBeforeSave(me, operation, saveOrDiscard);
                    } else {
                        saveOrDiscard();
                    }
                } else if (result === msls_modal_DialogResult.cancel) {
                    operation.error({ message: "User canceled the navigation by clicking Cancel button", userCanceled: true, noErrorDialog: true });
                } else if (result === msls_modal_DialogResult.none) {
                    operation.error({ message: "User canceled the navigation without clicking any buttons", userCanceled: true, noErrorDialog: true });
                } else {
                    operation.error({ message: "Cancel the navigation due to unexpected result.", userCanceled: true, noErrorDialog: true });
                }

            });
        });
    }

    function _navigateView(me, navigationUnit, isBrowserMode) {


        if (navigationUnit === me.beforeFirstPageNavigationUnit) {
            navigationUnit = me.navigationStack[0];
        }

        return msls_promiseOperation(function initNavigateView(operation) {
            if (me.activeNavigationUnit !== navigationUnit) {
                msls_mark(msls_codeMarkers.pageActivationStart);
                if (me.activeNavigationUnit) {
                    me.activeNavigationUnit.contentItemTree._deactivate();
                }
                navigationUnit.contentItemTree._activate();
                msls_mark(msls_codeMarkers.pageActivationEnd);
            }

            function afterNavigation() {
                me.activeNavigationUnit = navigationUnit;

                if (!isBrowserMode) {
                    _cleanUpNavigationStack(me);
                }

                me.finishNavigation()._thenEx(function (error) {
                    if (!error) {
                        msls_notify(msls_shell_activeNavigationUnitChangedNotification, me);
                    }
                });

                operation.complete();
            }

            if (isBrowserMode) {
                me.shellView.awaitBrowserNavigation(navigationUnit)
                .then(function success() {
                    _cleanUpNavigationStack(me);
                });

                afterNavigation();
            } else {
                me.shellView.navigate(navigationUnit)
                .then(afterNavigation,
                    function fail(error) {
                        operation.error(error || msls_getResourceString("shell_nav_failed"));
                    });
            }
        });
    }

    function _determineTargetForApplyOrCancel(me, navigateBackOption) {

        var boundaryUnit = me.activeNavigationUnit.boundaryUnit,
            beforeBoundaryUnit;


        if (navigateBackOption === msls_NavigateBackOption.none) {
            return null;
        }

        if (!!boundaryUnit && boundaryUnit.boundaryOption === msls_BoundaryOption.nested) {
            beforeBoundaryUnit = _findPreviousNavigationUnit(me, boundaryUnit);
        }

        return beforeBoundaryUnit;
    }

    function _determineNavigateBackOptionForSaveDiscard(me, navigateBackOption) {

        switch (navigateBackOption) {
            case msls_NavigateBackOption.none:
            case msls_NavigateBackOption.saveBoundary:
            case msls_NavigateBackOption.beforeSaveBoundary:
                return navigateBackOption;
        }

        return defaultNavigateBackOption;
    }

    function _determineTargetForSaveOrDiscard(me, navigateBackOption) {

        var boundaryUnit = me.activeNavigationUnit.boundaryUnit,
            navigationTarget;

        if (!boundaryUnit || (boundaryUnit.boundaryOption !== msls_BoundaryOption.save)) {
            return null;
        }

        if (navigateBackOption === msls_NavigateBackOption.none) {
            navigationTarget = null;
        } else if (navigateBackOption === msls_NavigateBackOption.saveBoundary) {
            navigationTarget = boundaryUnit;
        } else {
            navigationTarget = boundaryUnit;
            if (boundaryUnit.index > 0) {
                navigationTarget = _findNavigationUnitWithIndex(me, boundaryUnit.index - 1);
            }
        }

        return navigationTarget;
    }

    function _computeCanSaveChanges() {
        var navigationUnit = this.activeNavigationUnit;
        if (navigationUnit) {
            var screenDetails = navigationUnit.screen.details,
                dataWorkSpaceDetails = screenDetails.dataWorkspace.details,
                canSaveChanges = !dataWorkSpaceDetails.hasNestedChangeSets;

            return canSaveChanges;
        }

        return false;
    }

    function _computeCanDiscardChanges() {
        return this.canSaveChanges;
    }

    function _computeCanApplyNestedChanges() {
        var navigationUnit = this.activeNavigationUnit;
        if (navigationUnit) {
            var boundaryUnit = navigationUnit.boundaryUnit;
            return boundaryUnit.boundaryOption === msls_BoundaryOption.nested &&
                    !!boundaryUnit.nestedChangeSet;
        }

        return false;
    }

    function _computeCanCancelNestedChanges() {
        return this.canApplyNestedChanges;
    }

    function isOnHomeScreen(shellViewModel) {
        var activeNavUnit;
        return !!(activeNavUnit = shellViewModel.activeNavigationUnit) &&
            activeNavUnit.task.home;
    }

    function _computeCanNavigateHome() {
        return !isOnHomeScreen(this);
    }

    function _cleanUpNavigationStack(me) {
        var currentIndex = me.activeNavigationUnit.index,
            toClean = [];

        msls_mark(msls_codeMarkers.cleanNavigationStackStart);

        $.each(me.navigationStack, function (id, unit) {
            if (unit.index > currentIndex) {
                toClean.push(unit);
            }
        });

        var unitsInReverseOrder = toClean.sort(function (a, b) {
            return b.index - a.index;
        });

        $.each(unitsInReverseOrder, function (id, unit) {
            _closeNavigationUnit(me, unit);
        });

        msls_mark(msls_codeMarkers.cleanNavigationStackEnd);
    }

    function _closeNavigationUnit(me, navigationUnit) {

        delete me.navigationStack[navigationUnit.index];

        var onClosed = me.shellView.onNavigationUnitClosed;
        if (onClosed) {
            onClosed.call(me.shellView, navigationUnit);
        }
    }


    function NavigationDescription() {

        this.navigationUnitsCrossedOver = [];
    }
    NavigationDescription.prototype = {
        isForward: false,
        isBackward: false,
        isBrowserMode: false,
        sourceNavigationUnit: null,

        targetNavigationUnit: null,

        navigationUnitsCrossedOver: null,

        crossesSaveBoundary: false,
        crossesNestedBoundary: false,

        onlyApplyNestedChanges: false
    };

    function _createBackwardNavigationDescription(me, sourceNavigationUnit, targetNavigationUnit, isBrowserMode) {

        var isTargetNavigationUnitBeforeFirstPage = targetNavigationUnit === me.beforeFirstPageNavigationUnit;
        var description = new NavigationDescription();
        description.sourceNavigationUnit = sourceNavigationUnit;
        description.targetNavigationUnit = targetNavigationUnit;
        description.isBackward = true;
        description.isBrowserMode = isBrowserMode;

        var navigationUnit = sourceNavigationUnit;
        while (navigationUnit) {
            if (navigationUnit === targetNavigationUnit) {
                break;
            }

            description.navigationUnitsCrossedOver.push(navigationUnit);

            switch (navigationUnit.boundaryOption) {
                case msls_BoundaryOption.nested:
                    description.crossesNestedBoundary = true;
                    break;

                case msls_BoundaryOption.save:
                    description.crossesSaveBoundary = true;
                    break;

            }

            var
            nextIndex = navigationUnit.index - 1,
            nextNavigationUnit = _findNavigationUnitWithIndex(me, nextIndex);

            navigationUnit = nextNavigationUnit;
        }

        description.navigationUnitsCrossedOver = description.navigationUnitsCrossedOver.reverse();


        return description;
    }

    function _createForwardNavigationDescription(me, sourceNavigationUnit, boundaryOption) {

        var description = new NavigationDescription();
        description.sourceNavigationUnit = sourceNavigationUnit;
        description.isForward = true;

        description.crossesSaveBoundary = boundaryOption === msls_BoundaryOption.save;
        description.crossesNestedBoundary = boundaryOption === msls_BoundaryOption.nested;

        if (description.crossesSaveBoundary) {
            for (var id in me.navigationStack) {
                var navigationUnit = me.navigationStack[id];
                if (navigationUnit.screen === sourceNavigationUnit.screen) {
                    description.navigationUnitsCrossedOver.push(navigationUnit);
                }
            }
        } else {
            description.navigationUnitsCrossedOver.push(sourceNavigationUnit);
        }

        return description;
    }

    function _createTaskViewModel(me, screenObject, taskBoundaryOption) {

        var task = new msls.TaskViewModel(me, screenObject, taskBoundaryOption);

        task.home = screenObject.details.getModel().id === me._homeScreen.id;


        task.tabCommands = [];
        var tabs = screenObject.details.pages.filter(function (page) {
            return page.pageKind === msls_PageKind.tab;
        });

        for (var i = 0; i < tabs.length; i++) {
            var tab = tabs[i],
                commandName = tab.name,
                commandVM = msls_createShellCommandViewModel("showTab", screenObject,
                    msls_createBoundArguments(null, [{ value: tab.name }]),
                    tab.displayName,
                    commandName),
                displayNameBinding = new msls.data.DataBinding("displayName", tab, "displayName", commandVM);

            displayNameBinding.bind();
            task.tabCommands.push(commandVM);
        }

        var titleScreen;

        titleScreen = screenObject;

        var titleBinding = new msls.data.DataBinding("displayName", titleScreen.details, "screenTitle", task,
            msls_data_DataBindingMode.oneWayFromSource);
        titleBinding.bind();

        return task;
    }

    function _completeOrFailOperation(operation, error) {
        if (error) {
            operation.error(error);
        } else {
            operation.complete();
        }
    }


    msls_defineClass(msls, "ShellViewModel",
        function ShellViewModel() {
            var me = this,
                securityDataService = msls.securityDataService;


            me.navigationStack = {};

            securityDataService.getAuthenticationType()
                .then(function (authenticationType) {
                    me._isFormsAuthEnabled = authenticationType ===
                        securityDataService.AuthenticationType.forms;
                });
        }, null, {
            activeNavigationUnit: msls_observableProperty(),
            logoPath: msls_observableProperty(),
            canSaveChanges: msls_computedProperty(_computeCanSaveChanges),
            canDiscardChanges: msls_computedProperty(_computeCanDiscardChanges),
            canApplyNestedChanges: msls_computedProperty(_computeCanApplyNestedChanges),
            canCancelNestedChanges: msls_computedProperty(_computeCanCancelNestedChanges),
            canNavigateHome: msls_computedProperty(_computeCanNavigateHome),

            applyChanges: applyChanges,
            commitChanges: commitChanges,
            cancelChanges: cancelChanges,
            saveChanges: saveChanges,
            discardChanges: discardChanges,
            applyNestedChanges: applyNestedChanges,
            cancelNestedChanges: cancelNestedChanges,

            showScreen: showScreen,
            showTab: showTab,
            showPopup: showPopup,
            closePopup: closePopup,
            navigateBack: navigateBack,
            navigateHome: navigateHome,
            logout: logout,

            _requestNavigateBack: _requestNavigateBack,
            synchronizeAfterBrowserNavigation: synchronizeAfterBrowserNavigation,
            validateActivePage: validateActivePage,
            initialize: initialize,
            findNavigationUnits: findNavigationUnits,
            navigationInProgress: msls_accessorProperty(function () {
                return !!this._currentNavigationOperation;
            }),
            finishNavigation: finishNavigation,
            _startNavigationOperation: _startNavigationOperation,

            anyNavigationUnitHasChanges: anyNavigationUnitHasChanges,

            _isFormsAuthEnabled: msls_observableProperty(),

            _onDispose:
                function _onDispose() {
                    var me = this;
                    msls_dispose(me.saveCommand);
                    msls_dispose(me.discardCommand);
                    msls_dispose(me.okCommand);
                    msls_dispose(me.cancelCommand);
                    msls_dispose(me.backCommand);
                    msls_dispose(me.closeCommand);
                    msls_dispose(me.logoutCommand);
                }

        }
    );

    msls_setProperty(msls, "shell", new msls.ShellViewModel());
    msls_shell = msls.shell;

    msls_expose("showProgress", function showProgress(promise) {
        if (promise) {
            msls_shell.shellView.showProgress(promise);
        }
    });

}());

var msls_createScreenLoaderArguments;

(function () {
    var _ScreenCollectionPropertyLoader,
        _EntityState = msls.EntityState;

    function getPropertyModel(screenDetails, entry) {
        var screenModel = screenDetails.getModel(),
            propertyModel = screenModel ? msls_findModelItem(screenModel.properties, entry.name) : null;
        return propertyModel;
    }

    function createScreenLoaderArgumentsCore(
        screenDetails,
        propertyModel) {

        var source, descriptors = [];

        if (!!propertyModel &&
            !!(source = propertyModel.source)) {
            var info = msls_parseScreenRelativeExpression(source);
            descriptors = info.argumentBindings;
        }

        return msls_createBoundArguments(screenDetails.screen, descriptors);
    }

    msls_createScreenLoaderArguments =
    function createScreenLoaderArguments(
        screenDetails,
        entry) {
        return createScreenLoaderArgumentsCore(screenDetails, getPropertyModel(screenDetails, entry));
    };

    function handleArgumentsChanged(me) {
        var invalidatedCallback = me._invalidatedCallback;
        if (invalidatedCallback) {
            invalidatedCallback();
        }
    }

    function addDelayInvalidationListener(loader, boundArguments, callback) {
        boundArguments.addChangeListener(null, function () {
            if (!loader._delayingInvalidation) {
                loader._delayingInvalidation = true;
                setTimeout(function () {
                    loader._delayingInvalidation = false;
                    callback();
                }, 250);
            }
        });
    }

    msls_defineClass(msls, "ScreenCollectionPropertyLoader",
        function ScreenCollectionPropertyLoader(
            screenDetails,
            entry) {

            var me = this,
                propertyModel = getPropertyModel(
                    screenDetails, entry),
                disablePaging = !!propertyModel.disablePaging;

            msls_CollectionLoader.call(me, propertyModel.pageSize);

            msls_setProperty(me, "_screenDetails", screenDetails);
            msls_setProperty(me, "_entry", entry);
            msls_setProperty(me, "_arguments",
                createScreenLoaderArgumentsCore(screenDetails, propertyModel));

            if (disablePaging) {
                msls_setProperty(me, "_disablePaging", true);
            }

            addDelayInvalidationListener(me, me._arguments, function () {
                handleArgumentsChanged(me);
            });
        },
        msls_CollectionLoader, {
            deleteItem:
                function deleteItem(item) {
                    item.deleteEntity();
                },

            _onDispose:
                function _onDispose() {
                    msls_dispose(this._arguments);
                }
        }
    );
    _ScreenCollectionPropertyLoader = msls.ScreenCollectionPropertyLoader;

    function getEntitySet(me, entityType) {

        var entitySet = me._entitySet,
            baseQuery;

        if (!entitySet) {
            baseQuery = me._baseQuery;
            if (baseQuery) {
                entitySet = baseQuery._entitySet;
            } else {
                if (!entityType) {
                    entityType = me._entry.elementType;
                }
                entitySet = msls_EntitySet_getEntitySetForEntityType(
                    me._screenDetails.dataWorkspace, entityType);
            }
            me._entitySet = entitySet;
        }
        return entitySet;
    }

    function screenCollectionPropertyLoader_addNewItem(me) {

        var _entityType = me._entry.elementType,
            entitySet = getEntitySet(me, _entityType);


        return new _entityType(entitySet);
    }
    function screenCollectionPropertyLoader_addNewItem_canExecute(me) {
        var _entityType = me._entry.elementType,
            entitySet = getEntitySet(me, _entityType);
        return entitySet.canInsert;
    }

    function contentChangeHandler(me, entity) {
        var collectionChangeCallback = me._collectionChangeCallback,
            entityState;

        if (collectionChangeCallback && entity instanceof me._entry.elementType) {
            entityState = entity.details.entityState;

            if (entityState === _EntityState.added) {
                collectionChangeCallback(msls_CollectionChangeAction.add, entity);
            } else if (entityState === _EntityState.discarded) {
                collectionChangeCallback(msls_CollectionChangeAction.remove, entity);
            }
        }
    }

    msls_defineClass(msls, "ScreenQueryPropertyLoader",
        function ScreenQueryPropertyLoader(screenDetails, entry) {
            var me = this;
            _ScreenCollectionPropertyLoader.call(me, screenDetails, entry);

            msls_addAutoDisposeEventListener(
                me._screenDetails.dataWorkspace.details,
                "contentchange",
                me,
                function (e) {
                    contentChangeHandler(me, e.detail);
                }
            );
        },
        _ScreenCollectionPropertyLoader, {
            _baseQuery: msls_accessorProperty(
                function _baseQuery_get() {
                    return this._entry.createQuery.apply(
                        this._screenDetails, this._arguments.getCurrentValues());
                }
            ),
            _getAddedEntities:
                function _getAddedEntities() {
                    return getEntitySet(this)._addedEntities;
                },
            addNewItem:
                function addNewItem() {
                    return screenCollectionPropertyLoader_addNewItem(this);
                }
        }
    );
    msls_makeDataServiceQueryLoader(msls.ScreenQueryPropertyLoader);
    msls_setProperty(msls.ScreenQueryPropertyLoader.prototype.addNewItem, "canExecute",
        function addNewItem_canExecute() {
            return screenCollectionPropertyLoader_addNewItem_canExecute(this);
        }
    );

    function entityCollectionChange(me, collectionChange) {
        var collectionChangeCallback = me._collectionChangeCallback,
            action = collectionChange.action;
        if (!!collectionChangeCallback &&
            (action === msls_CollectionChangeAction.add || action === msls_CollectionChangeAction.remove)) {
            collectionChangeCallback(action, collectionChange.items[0]);
        }
    }

    function resetScreenNavigationPropertyLoader(me) {

        var collectionProperty = me._collectionProperty,
            collectionChangeHandler = me._collectionChangeHandler,
            collectionChangeEventName = "collectionchange",
            entityCollection;

        if (collectionChangeHandler) {
            msls_dispose(collectionChangeHandler);
        }

        collectionProperty = me._collectionProperty = me._entry.getNavigationProperty.apply(me._screenDetails);
        if (collectionProperty) {
            entityCollection = msls_Entity_getEntityCollection(collectionProperty);

            me._collectionChangeHandler = msls_addAutoDisposeEventListener(
                entityCollection,
                collectionChangeEventName,
                me,
                function (e) {
                    entityCollectionChange(me, e.detail);
                }
            );
        }
    }

    msls_defineClass(msls, "ScreenNavigationPropertyLoader",
        function ScreenNavigationPropertyLoader(
            screenDetails,
            entry) {


            var me = this,
                propertyModel, queryModel, source, descriptors = [], sourceBinding;

            _ScreenCollectionPropertyLoader.call(me, screenDetails, entry);

            if (!!(propertyModel = getPropertyModel(me._screenDetails, me._entry)) &&
                !!(queryModel = propertyModel.query) &&
                !!(source = queryModel.source)) {
                var info = msls_parseScreenRelativeExpression(source);
                descriptors.push({ binding: info.lastObjectBindingPath });
            }

            sourceBinding = msls_createBoundArguments(screenDetails.screen, descriptors);
            sourceBinding.addChangeListener(null, function () {
                resetScreenNavigationPropertyLoader(me);
                handleArgumentsChanged(me);
            });

            msls_addLifetimeDependency(me, sourceBinding);

            resetScreenNavigationPropertyLoader(me);
        },
        _ScreenCollectionPropertyLoader, {
            _baseQuery: msls_accessorProperty(
                function _baseQuery_get() {
                    var me = this,
                        collectionProperty = me._collectionProperty,
                        query = collectionProperty && collectionProperty.query,
                        appendQuery = me._entry.appendQuery;
                    if (!!query && !!appendQuery) {
                        query = appendQuery.apply(query,
                            me._arguments.getCurrentValues());
                    }
                    return query;
                }
            ),
            _getAddedEntities:
                function _getAddedEntities() {
                    var results = [],
                        collectionProperty = this._collectionProperty;
                    if (collectionProperty) {
                        results = msls_Entity_getAddedEntitiesInCollection(
                            collectionProperty);
                    }
                    return results;
                },
            addNewItem:
                function addNewItem() {
                    var me = this,
                        collectionProperty = me._collectionProperty,
                        newEntity = screenCollectionPropertyLoader_addNewItem(
                            me),
                        data,
                        toPropertyName;
                    if (!!collectionProperty) {
                        data = collectionProperty._entry.data;

                        if (!!data) {
                            toPropertyName = data.toPropertyName;
                            if (!!toPropertyName) {
                                newEntity[toPropertyName] = collectionProperty.owner;
                            }
                        }
                    }
                    return newEntity;
                }
        }
    );
    msls_makeDataServiceQueryLoader(msls.ScreenNavigationPropertyLoader);
    msls_setProperty(msls.ScreenNavigationPropertyLoader.prototype.addNewItem, "canExecute",
        function addNewItem_canExecute() {
            return screenCollectionPropertyLoader_addNewItem_canExecute(this);
        }
    );

}());

(function () {

    msls_defineClass(msls, "ScreenScalarPropertyLoader",
        function ScreenScalarPropertyLoader(
            screenDetails, entry, invalidatedCallback) {

            var me = this;

            msls_setProperty(me, "_screenDetails", screenDetails);
            msls_setProperty(me, "_entry", entry);
            msls_setProperty(me, "_arguments", msls_createScreenLoaderArguments(
                screenDetails,
                entry));

            me._arguments.addChangeListener(null, invalidatedCallback);
        }, null, {
            load: function load() {
                var me = this,
                    activePromise = me._activePromise,
                    baseQuery,
                    loadOperationDone;

                if (!activePromise) {
                    activePromise = me._activePromise = msls_promiseOperation(
                        function initLoad(operation) {
                            baseQuery = me._entry.createQuery.apply(
                                    me._screenDetails, me._arguments.getCurrentValues());
                            baseQuery.execute()._thenEx(
                                function (error, queryResult) {
                                    loadOperationDone = true;
                                    me._activePromise = null;

                                    if (error) {
                                        operation.error(error);
                                    } else {
                                        operation.complete(queryResult.results[0]);
                                    }
                                }
                            );
                            operation.interleave();
                        }
                    );

                    if (loadOperationDone) {
                        me._activePromise = null;
                    }
                }

                return activePromise;
            }
        }
    );

}());

(function () {

    var _Screen = msls.Screen,
        _ScreenDetails = _Screen.Details,
        _ScreenProperty,
        _LocalProperty,
        _RemoteProperty,
        _ReferenceProperty,
        _CollectionProperty,
        _ComputedProperty;

    msls_defineClass(_ScreenDetails, "Property",
        function Screen_Details_Property(details, entry) {
            msls_BusinessObject_Details_Property.call(this, details, entry);
            this.screen = this.owner;
        },
        msls_BusinessObject_Details_Property
    );
    _ScreenProperty = _ScreenDetails.Property;

    function getScreenPropertyValue() {
        return this._entry.get.call(this._details.owner);
    }

    function setScreenPropertyValue(value) {
        this._entry.set.call(this._details.owner, value);
    }

    msls_defineClass(_ScreenDetails, "LocalProperty",
        function Screen_Details_LocalProperty(details, entry) {
            _ScreenProperty.call(this, details, entry);
        },
        _ScreenProperty, {
            value: msls_observableProperty(null,
                getScreenPropertyValue,
                setScreenPropertyValue
            )
        }
    );
    _LocalProperty = _ScreenDetails.LocalProperty;

    msls_defineClass(_ScreenDetails, "RemoteProperty",
        function Screen_Details_RemoteProperty(details, entry) {
            _ScreenProperty.call(this, details, entry);
        },
        _ScreenProperty, {
            isLoaded: msls_observableProperty(false,
                function isLoaded_get() {
                    var details = this._details,
                        data = details._propertyData[this.name];

                    return !!data._isLoaded;
                }
            ),
            loadError: msls_observableProperty(null),
            value: msls_observableProperty(null, getScreenPropertyValue)
        }
    );
    _RemoteProperty = _ScreenDetails.RemoteProperty;

    function loadRemoteProperty(
        me,
        data,
        initLoad) {
        var loadPromise = data._loadPromise;

        if (!loadPromise) {
            if (data._isLoaded) {
                data._isLoaded = false;
                me.dispatchChange("isLoaded");
            }
            data._loading = true;
            if (me.loadError) {
                me.loadError = null;
            }

            loadPromise = data._loadPromise = msls_promiseOperation(
                initLoad, !!msls_data_isDataBinding);

            if (!data._loading) {
                data._loadPromise = null;
            }
        }

        return loadPromise;
    }

    function completeLoadRemoteProperty(
        me,
        data,
        error) {
        data._loading = false;

        data._isLoaded = true;
        me.dispatchChange("isLoaded");

        if (error) {
            me.loadError = error;
        }

        data._loadPromise = null;
    }

    msls_defineClass(_ScreenDetails, "ReferenceProperty",
        function Screen_Details_ReferenceProperty(details, entry) {
            _RemoteProperty.call(this, details, entry);
        },
        _RemoteProperty, {
            load: function load() {
                var me = this,
                    details = me._details,
                    propertyName = me.name,
                    data = details._propertyData[propertyName],
                    loadPromise;

                loadPromise = loadRemoteProperty(
                    me,
                    data,
                    function initLoad(operation) {
                        var loader = data._loader;
                        if (!loader) {
                            loader = data._loader = new msls.ScreenScalarPropertyLoader(
                                details, me._entry, function onLoaderInvalidated() {
                                    details.properties[propertyName].load();
                                }
                            );
                        }
                        loader.load()._thenEx(function (error, entity) {
                            completeLoadRemoteProperty(
                                me,
                                data,
                                error);

                            if (data._value !== entity) {
                                data._value = entity;

                                me.dispatchChange("value");
                                me.screen.dispatchChange(propertyName);
                            }

                            if (!error) {
                                operation.complete(entity);
                            } else {
                                operation.error(error);
                            }
                        });
                        operation.interleave();
                    }
                );
                return loadPromise;
            }
        }
    );
    _ReferenceProperty = _ScreenDetails.ReferenceProperty;

    msls_Screen_rawGetCollectionPropertyValue =
    function rawGetCollectionPropertyValue(
        details,
        entry,
        data) {

        var value = data._value,
            loader;

        if (!value) {
            loader = createCollectionLoader(details, entry);
            value = data._value = new entry.type(details, loader);

            msls_addLifetimeDependency(value, loader);
            msls_addLifetimeDependency(details, value);
        }

        return value;
    };

    msls_defineClass(_ScreenDetails, "CollectionProperty",
        function Screen_Details_CollectionProperty(details, entry) {
            _RemoteProperty.call(this, details, entry);
        },
        _RemoteProperty, {
            isReadOnly: msls_accessorProperty(
                function isReadOnly_get() {
                    return msls_EntitySet_isEntitySetReadOnly(
                            this._details.dataWorkspace,
                            this._entry.elementType);
                }
            ),
            load: function load() {
                var me = this,
                    details = me._details,
                    data = details._propertyData[me.name],
                    loadPromise;

                loadPromise = loadRemoteProperty(
                    me,
                    data,
                    function initLoad(operation) {

                        var vc = msls_Screen_rawGetCollectionPropertyValue(
                            details, me._entry, data);

                        function afterLoad(error) {
                            completeLoadRemoteProperty(
                                me,
                                data,
                                error);
                            if (!error) {
                                operation.complete(vc);
                            } else {
                                operation.error(error);
                            }
                        }

                        if (vc.canLoadMore) {
                            vc.load()._thenEx(afterLoad);
                            operation.interleave();
                        } else {
                            afterLoad(null);
                        }
                    }
                );
                return loadPromise;
            }
        }
    );
    _CollectionProperty = _ScreenDetails.CollectionProperty;

    function createCollectionLoader(screenDetails, entry) {
        if (entry.getNavigationProperty) {
            return new msls.ScreenNavigationPropertyLoader(screenDetails, entry);
        } else {
            return new msls.ScreenQueryPropertyLoader(screenDetails, entry);
        }
    }

}());

(function () {

    var _VisualCollection = msls.VisualCollection,
        _EntityState = msls.EntityState,
        _VisualCollectionState;

    msls_defineEnum(_VisualCollection, {
        State: {
            idle: "idle",
            loading: "loading",
            loadingMore: "loadingMore"
        }
    });
    _VisualCollectionState = _VisualCollection.State;

    msls_initVisualCollection = function initVisualCollection(visualCollection, screenDetails, loader) {
        var me = visualCollection;

        me.screen = screenDetails ? screenDetails.owner : null;
        msls_setProperty(me, "_loader", loader);
        msls_setProperty(me, "_data", []);
        msls_setProperty(me, "_deferredEvents", []);

        loader.subscribe(function (action, item) {
            onLoaderCollectionChange(me, action, item);
        }, function (action, item) {
            onLoaderInvalidated(me);
        });
    };

    function onLoaderInvalidated(me) {
        if (me._loadOperation) {
            me._loadOperation.code(function () {
                resetAndLoadNext(me);
            })();
        } else {
            loadCore(me, false, me._mergeOption);
        }
    }

    function onLoaderCollectionChange(me, action, item) {

        var data = me._data,
            foundIndex = -1;

        if (action === msls_CollectionChangeAction.add) {
            data.splice(0, 0, item);
            publishEvent(me, "change", "count");
            publishEvent(me, "collectionchange",
                        new msls_CollectionChange(action, [item], -1, 0));
        } else {
            $.each(data, function (index, o) {
                if (o === item) {
                    data.splice(index, 1);
                    foundIndex = index;
                    return false;
                }
                return true;
            });

            if (foundIndex >= 0) {
                if (me.selectedItem === item) {
                    me.selectedItem = null;
                }
                publishEvent(me, "change", "count");
                publishEvent(me, "collectionchange",
                        new msls_CollectionChange(msls_CollectionChangeAction.remove, [item], foundIndex, -1));
            }
        }
    }

    function holdEvents(me) {
        me._deferEvents = true;
    }

    function releaseEvents(me) {
        var list = me._deferredEvents;
        me._deferEvents = false;
        $.each(list, function () {
            if (this.type === "change") {
                me.dispatchChange(this.e);
            } else {
                me.dispatchEvent(this.type, this.e);
            }
        });
        list.length = 0;
    }

    function publishEvent(me, type, e) {
        if (me._deferEvents) {
            me._deferredEvents.push({ type: type, e: e });
        } else {
            if (type === "change") {
                me.dispatchChange(e);
            } else {
                me.dispatchEvent(type, e);
            }
        }
    }

    function setFieldAndPublishEvent(me, fieldName, value, propertyName) {
        if (me[fieldName] !== value) {
            me[fieldName] = value;
            publishEvent(me, "change", propertyName);
        }
    }

    function selectedItem_get() {
        return this._selectedItem;
    }

    function selectedItem_set(value) {
        setFieldAndPublishEvent(this, "_selectedItem", value, "selectedItem");
    }

    function setIsLoaded(me, value) {
        setFieldAndPublishEvent(me, "_isLoaded", value, "isLoaded");
    }

    function setLoadError(me, value) {
        setFieldAndPublishEvent(me, "_loadError", value, "loadError");
    }

    function loadCore(me, independent, mergeOption) {
        var loadPromise = me._loadPromise,
            eventsPublished, operationInitialized;

        function tryPublishLoadEvents() {
            if (!eventsPublished) {
                eventsPublished = true;
                publishEvent(me, "change", "state");
                publishEvent(me, "change", "canLoadMore");
                setLoadError(me, null);
            }
        }

        if (loadPromise) {
            return loadPromise;
        }

        me._loadMorePromise = null;

        msls_setProperty(me, "_mergeOption", mergeOption);

        loadPromise = me._loadPromise =
        msls_promiseOperation(function initLoad(operation) {
            operationInitialized = true;
            me._loadOperation = operation;
            loadPromise = me._loadPromise = operation.promise();
            tryPublishLoadEvents();

            resetAndLoadNext(me);
        }, independent);

        if (operationInitialized && !me._loadOperation) {
            me._loadPromise = null;
        }

        tryPublishLoadEvents();

        return loadPromise;
    }

    function load(independent) {
        return loadCore(this, independent);
    }

    function refresh() {
        return loadCore(this, false, msls_MergeOption.unchangedOnly);
    }

    function resetAndLoadNext(me) {
        var loader = me._loader,
            loadOperation = me._loadOperation,
            loaderPromise;

        if (!loader) {
            if (loadOperation) {
                loadOperation.complete();
            }
            return;
        }

        loader.reset();

        loaderPromise = me._activeLoaderPromise = loader.loadNext(me._mergeOption);
        loaderPromise._thenEx(function (error, items) {
            if (me._activeLoaderPromise === loaderPromise) {
                resetAndLoadNextCompleted(me, items, error);
            }
        });
        if (loadOperation) {
            loadOperation.interleave();
        }
    }

    function resetAndLoadNextCompleted(me, items, error) {
        msls_mark(msls_codeMarkers.fillCollectionStart);
        var data = me._data,
            loadOperation = me._loadOperation;

        me._loadOperation = null;
        me._loadPromise = null;

        try {
            holdEvents(me);
            if (error) {
                setLoadError(me, error);
            } else {
                setLoadError(me, null);

                data.length = 0;
                $.each(items, function () {
                    data.push(this);
                });

                publishEvent(me, "change", "state");
                publishEvent(me, "change", "count");
                publishEvent(me, "collectionchange", new msls_CollectionChange(msls_CollectionChangeAction.refresh));
                setIsLoaded(me, true);
                publishEvent(me, "change", "canLoadMore");
                me.selectedItem = null;
            }
            releaseEvents(me);
        }
        finally {
            if (error) {
                loadOperation.error(error);
            } else {
                loadOperation.complete(me.count);
            }

            msls_mark(msls_codeMarkers.fillCollectionEnd);
        }
    }

    function loadMore(independent) {
        var me = this,
            loadMorePromise = me._loadMorePromise,
            eventsPublished, operationInitialized;

        function throwIfCannotLoadMore() {
            if (!me.canLoadMore) {
                var errorMessage;
                if (me._loadPromise) {
                    errorMessage = msls_getResourceString("visualCollection_load_pending");
                } else {
                    errorMessage = msls_getResourceString("visualCollection_already_loaded");
                }
                msls_throwInvalidOperationError(errorMessage);
            }
        }

        function tryPublishLoadMoreEvents() {
            if (!eventsPublished) {
                eventsPublished = true;

                publishEvent(me, "change", "state");
            }
        }

        if (loadMorePromise) {
            return loadMorePromise;
        }

        throwIfCannotLoadMore();

        loadMorePromise = me._loadMorePromise =
        msls_promiseOperation(function (operation) {
            var loader = me._loader,
                loaderPromise;

            if (!loader) {
                operation.complete();
                return;
            }

            throwIfCannotLoadMore();

            operationInitialized = true;
            me._loadMoreOperation = operation;
            loadMorePromise = me._loadMorePromise = operation.promise();

            tryPublishLoadMoreEvents();

            loaderPromise = me._activeLoaderPromise = loader.loadNext(
                me._mergeOption, me._data);
            loaderPromise._thenEx(function (error, items) {
                if (me._activeLoaderPromise === loaderPromise) {
                    loadNextCompleted(me, items, error);
                }
            });
            operation.interleave();
        }, independent);

        if (operationInitialized && !me._loadMoreOperation) {
            me._loadMorePromise = null;
        }

        tryPublishLoadMoreEvents();

        return loadMorePromise;
    }

    function loadNextCompleted(me, items, error) {
        msls_mark(msls_codeMarkers.fillCollectionStart);

        var data = me._data,
            startIndex = data.length,
            loadMoreOperation = me._loadMoreOperation;

        me._loadMoreOperation = null;
        me._loadMorePromise = null;

        try {
            holdEvents(me);
            if (error) {
                setLoadError(me, error);
            } else {
                setLoadError(me, null);

                $.each(items, function () {
                    data.push(this);
                });

                publishEvent(me, "change", "state");
                if (items.length > 1) {
                    publishEvent(me, "change", "count");
                    publishEvent(me, "collectionchange",
                        new msls_CollectionChange(msls_CollectionChangeAction.add, items, -1, startIndex));
                }
                setIsLoaded(me, true);
                if (!me.canLoadMore) {
                    publishEvent(me, "change", "canLoadMore");
                }
            }
            releaseEvents(me);
        }
        finally {
            if (error) {
                loadMoreOperation.error(error);
            } else {
                loadMoreOperation.complete({
                    items: items,
                    startIndex: startIndex
                });
            }

            msls_mark(msls_codeMarkers.fillCollectionEnd);
        }
    }

    function addNew() {
        var newItem = this._loader.addNewItem();
        this.selectedItem = newItem;
        return newItem;
    }
    addNew.canExecute = function addNew_canExecute() {
        var me = this,
            loader = me._loader,
            loaderAddNewItemCanExecute = loader.addNewItem.canExecute;

        return me.state === _VisualCollectionState.idle && (
            !loaderAddNewItemCanExecute ||
            loaderAddNewItemCanExecute.apply(loader));
    };

    function deleteSelected() {
        var selectedItem = this.selectedItem;
        if (selectedItem) {
            this._loader.deleteItem(selectedItem);
        } else {
            msls_throwInvalidOperationError(msls_getResourceString("visualCollection_no_sel"));
        }
    }
    deleteSelected.canExecute = function deleteSelected_canExecute() {
        var selectedItem = this.selectedItem,
            entityDetails, entitySet;
        return !!selectedItem &&
            !!(entityDetails = selectedItem.details) &&
            !!(entitySet = entityDetails.entitySet) &&
            entityDetails.entityState !== _EntityState.deleted &&
            entityDetails.entityState !== _EntityState.discarded &&
            (entityDetails.entityState === _EntityState.added || !!entitySet.canDelete);
    };

    msls_mixIntoExistingClass(_VisualCollection, {
        _deferEvents: false,
        _isLoaded: false,
        _loadError: null,
        _selectedItem: null,
        canLoadMore: msls_observableProperty(
            null,
            function canLoadMore_get() {
                return !this._loadPromise && this._loader.canLoadNext;
            }
        ),
        data: msls_accessorProperty(
            function data_get() {
                return this._data.slice(0);
            }
        ),
        count: msls_observableProperty(null,
            function count_get() {
                return this._data.length;
            }
        ),
        isLoaded: msls_observableProperty(null,
            function isLoaded_get() {
                return this._isLoaded;
            }
        ),
        state: msls_observableProperty(_VisualCollectionState.idle,
            function state_get() {
                if (this._loadPromise) {
                    return _VisualCollectionState.loading;
                } else if (this._loadMorePromise) {
                    return _VisualCollectionState.loadingMore;
                } else {
                    return _VisualCollectionState.idle;
                }
            }
        ),
        loadError: msls_observableProperty(null,
            function loadError_get() {
                return this._loadError;
            }
        ),
        selectedItem: msls_observableProperty(null, selectedItem_get, selectedItem_set),

        load: load,
        loadMore: loadMore,
        refresh: refresh,
        addNew: addNew,
        deleteSelected: deleteSelected,
        _onDispose:  function _onDispose() {
            var me = this,
                loader = me._loader;
            if (loader) {
                msls_dispose(loader);
                me._loader = null;
            }
            me.screen = null;
            me._data = [];
        },

        collectionchange: msls_event()
    });

    msls_makeVisualCollection =
    function makeVisualCollection(screenClass, entry) {
        var visualCollectionClass = _VisualCollection;
        return visualCollectionClass;
    };

    msls_expose("VisualCollection", _VisualCollection);

}());

var


    cssDefaultJqmTheme = "a",


    ui_page_active = "ui-page-active",


    msls_presenter_content = "msls-presenter-content",
    msls_presenter = "msls-presenter",



    ui_btn_active = "ui-btn-active",

    msls_list_empty = "msls-list-empty",
    msls_list_loading = "msls-list-loading",

    msls_extra_option = "msls-extra-option",

    
    msls_table_empty = "msls-list-empty",
    msls_table_loading = "msls-list-loading",


    msls_overlay = "msls-overlay",
    msls_overlay_active = "msls-overlay-active",
    msls_id_dialog_overlay = "msls-id-dialog-overlay",
    msls_id_progress_overlay = "msls-id-progress-overlay",
    msls_progress_icon = "msls-progress-icon",



    data_msls_weight = "data-msls-weight",
    msls_hstretch = "msls-hstretch",
    msls_hauto = "msls-hauto",
    msls_vstretch = "msls-vstretch",
    msls_vauto = "msls-vauto",
    msls_vscroll = "msls-vscroll",
    msls_columns_layout = "msls-columns-layout",
    msls_rows_layout = "msls-rows-layout",
    msls_layout_ignore = "msls-layout-ignore",
    msls_layout_ignore_children = "msls-layout-ignore-children",


    msls_viewer = "msls-viewer",

    msls_attached_label = "msls-label",
    msls_label_host = "msls-label-host",
    msls_state_overlay = "msls-state-overlay",
    ui_disabled = "ui-disabled",
    msls_collapsed = "msls-collapsed",
    msls_executing = "msls-executing",
    msls_display_error = "msls-display-error",
    msls_display_error_icon = "msls-display-error-icon",
    msls_display_error_text = "msls-display-error-text",
    msls_loading = "msls-loading",
    msls_read_only = "msls-read-only",
    msls_validation_error = "msls-validation-error",
    msls_validation_error_text = "msls-validation-error-text",


    msls_screen_tab = "msls-screen-tab",
    msls_screen_tab_active = "msls-screen-tab-active",

    msls_content = "msls-content",
    msls_content_selector = "." + msls_content,
    msls_tab_content = "msls-tab-content",
    msls_tab_content_active = "msls-tab-content-active",

    msls_header = "msls-header",

    msls_footer = "msls-footer",
    msls_footer_content = "msls-footer-content",
    msls_footer_content_active = "msls-footer-content-active",

    msls_page_expired = "msls-page-expired",


    msls_id_app_loading_selector = "#msls-id-app-loading",

    taskHeaderTemplateId = "taskHeaderTemplate",
    tabsBarTemplateId = "tabsBarTemplate",
    dialogHeaderTemplateId = "dialogHeaderTemplate",
    screenFooterTemplateId = "screenFooterTemplate",
    dialogFooterTemplateId = "dialogFooterTemplate",
    footerContentTemplateId = "footerContentTemplate",
    contentTemplateId = "contentTemplate",

    msls_background_page = "msls-background-page",
    msls_control_header = "msls-control-header",
    msls_dialog = "msls-dialog",
    msls_id_animation_timekeeper = "msls-id-animation-timekeeper",
    msls_logo = "msls-logo",

    msls_enable_modal_scroll_regions = "msls-enable-modal-scroll-regions",
    msls_show_background_screen = "msls-show-background-screen",
    msls_full_animation = "msls-full-animation",
    msls_quick_animation = "msls-quick-animation",


    msls_dialog_transition = "msls-dialog-transition",
    msls_nested_dialog_transition = "msls-nested-dialog-transition",
    msls_opening_transition = "msls-opening-transition",
    msls_screen_transition = "msls-screen-transition",
    msls_tab_transition = "msls-tab-transition",

    msls_in = "msls-in",
    msls_out = "msls-out",
    msls_reverse = "msls-reverse",
    msls_stage1 = "msls-stage1",
    msls_stage2 = "msls-stage2",
    msls_stage3 = "msls-stage3",


    msls_sharePoint_chrome = "msls-sharepoint-chrome",
    msls_sharePoint_enabled = "msls-sharepoint-enabled",
    msls_sharePoint_chrome_link = "msls-sharepoint-chrome-link",


    html_tabIndex_Attribute = "tabindex"


;

var msls_application,
    msls_TransitionAnimationLevel;

(function () {
    var isAndroidDevice,
        isPhoneDevice;

    msls_defineEnum(msls, {
        TransitionAnimationLevel: {
            full: "Full",
            simple: "Simple"
        }
    });
    msls_TransitionAnimationLevel = msls.TransitionAnimationLevel;

    function isAndroid() {

        var userAgent = navigator.userAgent,
            androidVersion = userAgent.match(/Android/);
        return !!androidVersion;
    }

    function isPhone() {
        var userAgent = navigator.userAgent.toLowerCase();
        return userAgent.indexOf("iphone") !== -1 || userAgent.indexOf("windows phone") !== -1;
    }

    isAndroidDevice = isAndroid();
    isPhoneDevice = isPhone();

    msls_appOptions.enableModalScrollRegions = !isAndroidDevice && !isPhoneDevice;
    msls_appOptions.showContentBehindDialog = !isAndroidDevice && !isPhoneDevice;
    msls_appOptions.transitionAnimationLevel =
        (isAndroidDevice || !!navigator.userAgent.match(/Opera/)) ?
        msls_TransitionAnimationLevel.simple : msls_TransitionAnimationLevel.full;


    function navigateHome() {
        return msls_shell.navigateHome();
    }
    navigateHome.canExecute = function navigateHome_canExecute() {
        return msls_shell.navigateHome.canExecute.call(msls_shell);
    };

    function showScreen(screenId, parameters, options) {
        return msls_shell.showScreen(
            screenId, parameters, null, false,
            options ? options.beforeShown : null,
            options ? options.afterClosed : null);
    }

    function applyChanges() {
        return msls_shell.applyChanges();
    }

    function commitChanges() {
        return msls_shell.commitChanges();
    }

    function cancelChanges() {
        return msls_shell.cancelChanges();
    }

    function navigateBack() {
        return msls_shell.navigateBack();
    }

    msls_addToInternalNamespace("application", {
        activeDataWorkspace: msls_accessorProperty(
            function activeDataWorkspace_get() {
                var unit = msls_shell.activeNavigationUnit;
                if (!unit) {
                    unit = msls_shell.navigationStack[0];
                }
                return unit.screen.details.dataWorkspace;
            }
        ),
        rootUri: msls_appRootUri,
        options: msls_appOptions,
        navigateHome: navigateHome,
        showScreen: showScreen,
        applyChanges: applyChanges,
        onsavechanges: msls_accessorProperty(
            function onsavechanges_get() {
                return this._listeners && this._listeners.savechanges;
            },
            function onsavechanges_set(value) {
                var me = this;
                if (me._listeners) {
                    me._listeners.savechanges = null;
                }
                WinJS.Utilities.eventMixin.addEventListener
                    .call(me, "savechanges", value);
            }
        ),
        commitChanges: commitChanges,
        cancelChanges: cancelChanges,
        navigateBack: navigateBack
    });
    msls_application = msls.application;

    msls_dispatchApplicationSaveChangesEvent =
    function dispatchApplicationSaveChangesEvent() {
        var details = {
            promise: null
        };
        WinJS.Utilities.eventMixin.dispatchEvent.call(
            window.msls.application, "savechanges", details);
        return details.promise;
    };

    msls_expose("_defineShowScreen", function defineShowScreen(method) {
        method.canExecute = function () {
            var options = arguments[method.length - 1];
            if (!!options && !!options.canExecute) {
                return options.canExecute.apply(this, arguments);
            }
            return true;
        };
        return method;
    });

    function run(homeScreenId) {
        msls_flushSuspendedCodeMarkers();
        if (!!window.performance && !!window.performance.timing.domContentLoadedEventStart) {
            msls_mark(msls_codeMarkers.applicationDomLoaded, new Date(window.performance.timing.domContentLoadedEventStart));
        }
        msls_mark(msls_codeMarkers.applicationRun);

        var $body = $("body");
        if (msls_appOptions.enableModalScrollRegions) {
            $body.addClass(msls_enable_modal_scroll_regions);
        }
        if (msls_appOptions.showContentBehindDialog) {
            $body.addClass(msls_show_background_screen);
        }
        if (msls_appOptions.transitionAnimationLevel === msls_TransitionAnimationLevel.full) {
            $body.addClass(msls_full_animation);
        } else {
            $body.addClass(msls_quick_animation);
        }

        return new WinJS.Promise(function initRun(complete, error) {
            $(msls_id_app_loading_selector + " img").on("error", function () {
                $(this).hide();
            });

            function applicationError(internalError) {
                error("The application could not be loaded.  Please try refreshing the page.\r\n" + internalError);
            }

            var promise = msls_resourcesReady();
            $(function () {
                promise.then(function () {
                    msls.services.modelService.load().then(
                        function onModelLoaded() {
                            msls_shell.initialize(null, homeScreenId)
                        .then(function success() {
                            complete();
                        }, function failure(e) {
                            error(e);
                        });
                        },
                        function onModelLoadError(description) {
                            var message = "Failed to load model: " + description;
                            applicationError(message);
                        }
                        ).then(null, function (e) {
                            applicationError(e);
                        });
                }, function (errorMessage) {
                    applicationError(errorMessage);
                });
            });
        });
    }

    msls_expose("application", Object.create(msls_application));

    msls_expose("_run", run);
    msls_expose("TransitionAnimationLevel", msls_TransitionAnimationLevel);

}());

var msls_templateStrings = {
"taskHeaderTemplate":
    '<div class="msls-header-area">' +
        '<div class="titles-bar">' +
            '<div class="msls-logo-back-area">' +
               ' LOGO-BACK-PLACEHOLDER' +
            '</div>' +
            '<div class="msls-buttons-row msls-screen-buttons">' +
               ' BUTTONS-PLACEHOLDER' +
           ' LOGOUT-PLACEHOLDER' +
            '</div>' +
            '<div class="msls-title-area">' +
                '<h1 class="subControl ui-title msls-title" control="Text" data-ls-text="text:{data.task.screenTitle}"></h1>' +
            '</div>' +
        '</div>' +
       ' TAB-BUTTONS-PLACEHOLDER' +
    '</div>',

"screenLogoTemplate":
    '<div class="msls-logo">' +
        '<img src="Content/Images/user-logo.png" />' +
    '</div>',

"screenBackTemplate":
    '<div class="msls-back-button-contain">' +
        '<div class="subControl msls-back-button msls-large-icon" control="ShellButton" tabindex="0" data-icon="msls-back"' +
           ' data-iconpos="notext" data-role="button" data-ls-content="content:{data.shell.backCommand.displayName}"' +
           ' data-ls-isenabled="isEnabled:{tap.canExecute}"' +
           ' data-ls-tap="tap:{data.shell.backCommand.command}">' +
        '</div>' +
    '</div>',

"screenSaveDiscardTemplate":
    '<div class="subControl msls-save-button msls-large-icon" control="ShellButton" tabindex="-1" data-icon="msls-save" data-iconpos="notext"' +
       ' data-role="button" data-ls-content="content:{data.shell.saveCommand.displayName}"' +
       ' data-ls-isenabled="isEnabled:{tap.canExecute}"' +
       ' data-ls-tap="tap:{data.shell.saveCommand.command}">' +
    '</div>' +
    '<div class="subControl msls-discard-button msls-large-icon" control="ShellButton" tabindex="-1" data-icon="msls-cancel" data-iconpos="notext"' +
       ' data-role="button" data-ls-content="content:{data.shell.discardCommand.displayName}"' +
       ' data-ls-isenabled="isEnabled:{tap.canExecute}"' +
       ' data-ls-tap="tap:{data.shell.discardCommand.command}">' +
    '</div>',

"screenOkTemplate":
    '<div class="subControl msls-ok-button msls-large-icon" control="ShellButton" tabindex="-1" data-icon="msls-ok" data-iconpos="notext"' +
       ' data-role="button" data-ls-content="content:{data.shell.okCommand.displayName}"' +
       ' data-ls-isenabled="isEnabled:{tap.canExecute}"' +
       ' data-ls-tap="tap:{data.shell.okCommand.command}">' +
    '</div>',

"screenOkCancelTemplate":
    '<div class="subControl msls-ok-button msls-large-icon" control="ShellButton" tabindex="-1" data-icon="msls-ok" data-iconpos="notext"' +
       ' data-role="button" data-ls-content="content:{data.shell.okCommand.displayName}"' +
       ' data-ls-isenabled="isEnabled:{tap.canExecute}"' +
       ' data-ls-tap="tap:{data.shell.okCommand.command}">' +
    '</div>' +
    '<div class="subControl msls-cancel-button msls-large-icon" control="ShellButton" tabindex="-1" data-icon="msls-cancel"' +
       ' data-iconpos="notext" data-role="button" data-ls-content="content:{data.shell.cancelCommand.displayName}"' +
       ' data-ls-isenabled="isEnabled:{tap.canExecute}"' +
       ' data-ls-tap="tap:{data.shell.cancelCommand.command}">' +
    '</div>',

"screenLogoutTemplate":
    '<div class="subControl msls-logout-button msls-large-icon" control="ShellButton" tabindex="-1" data-icon="msls-logout" data-iconpos="notext"' +
       ' data-role="button" data-ls-content="content:{data.shell.logoutCommand.displayName}"' +
       ' data-ls-isvisible="isVisible:{tap.canExecute}"' +
       ' data-ls-isenabled="isEnabled:{tap.canExecute}"' +
       ' data-ls-tap="tap:{data.shell.logoutCommand.command}">' +
    '</div>',

"dialogHeaderTemplate":
    '<div class="msls-header-area">' +
        '<div class="msls-buttons-row msls-dialog-buttons msls-hauto">' +
           ' BUTTONS-PLACEHOLDER' +
        '</div>' +
        '<h1 class="subControl ui-title msls-title" control="Text" data-ls-text="text:{data.dialogTitle}"></h1>' +
       ' TAB-BUTTONS-PLACEHOLDER' +
    '</div>',

"dialogSaveDiscardTemplate":
    '<div class="subControl msls-save-button msls-large-icon" control="ShellButton" tabindex="-1" data-icon="msls-save" data-iconpos="notext"' +
       ' data-role="button" data-ls-content="content:{data.shell.saveCommand.displayName}"' +
       ' data-ls-isenabled="isEnabled:{tap.canExecute}"' +
       ' data-ls-tap="tap:{data.shell.saveCommand.command}">' +
    '</div>' +
    '<div class="subControl msls-discard-button msls-large-icon" control="ShellButton" tabindex="-1" data-icon="msls-discard"' +
       ' data-iconpos="notext" data-role="button" data-ls-content="content:{data.shell.discardCommand.displayName}"' +
       ' data-ls-isenabled="isEnabled:{tap.canExecute}"' +
       ' data-ls-tap="tap:{data.shell.discardCommand.command}">' +
    '</div>',

"dialogOkTemplate":
    '<div class="subControl msls-ok-button msls-large-icon" control="ShellButton" tabindex="-1" data-icon="msls-ok" data-iconpos="notext"' +
       ' data-role="button" data-ls-content="content:{data.shell.okCommand.displayName}"' +
       ' data-ls-isenabled="isEnabled:{tap.canExecute}"' +
       ' data-ls-tap="tap:{data.shell.okCommand.command}">' +
    '</div>',

"dialogOkCancelTemplate":
    '<div class="subControl msls-ok-button msls-large-icon" control="ShellButton" tabindex="-1" data-icon="msls-ok" data-iconpos="notext"' +
       ' data-role="button" data-ls-content="content:{data.shell.okCommand.displayName}"' +
       ' data-ls-isenabled="isEnabled:{tap.canExecute}"' +
       ' data-ls-tap="tap:{data.shell.okCommand.command}">' +
    '</div>' +
    '<div class="subControl msls-cancel-button msls-large-icon" control="ShellButton" tabindex="-1" data-icon="msls-cancel"' +
       ' data-iconpos="notext" data-role="button" data-ls-content="content:{data.shell.cancelCommand.displayName}"' +
       ' data-ls-isenabled="isEnabled:{tap.canExecute}"' +
       ' data-ls-tap="tap:{data.shell.cancelCommand.command}">' +
    '</div>',

"dialogCloseTemplate":
    '<div class="subControl msls-close-button msls-large-icon" control="ShellButton" tabindex="-1" data-icon="msls-cancel"' +
       ' data-iconpos="notext" data-role="button" data-ls-content="content:{data.shell.closeCommand.displayName}"' +
       ' data-ls-isenabled="isEnabled:{tap.canExecute}"' +
       ' data-ls-tap="tap:{data.shell.closeCommand.command}">' +
    '</div>',

"tabsBarTemplate":
    '<div class="subControl msls-tabs-bar" control="ScreenTabs" data-ls-task="task:{data.task}"' +
       ' data-ls-activetab="activeTab:{data.pageName}"' +
       ' data-ls-hidetabtitles="hideTabTitles:{data.task.screen.properties.hideTabTitles}">' +
    '</div>',

"screenFooterTemplate":
    '<div class="msls-footer" data-role="footer" data-position="fixed" data-track-persistent-toolbars="false"' +
       ' data-update-page-padding="false"' +
       ' data-tap-toggle-blacklist="a, button, input, select, textarea, .ui-header-fixed, .ui-footer-fixed, .ui-popup, li">' +
    '</div>',

"dialogFooterTemplate":
    '<div class="msls-footer msls-vauto" data-role="footer">' +
    '</div>',

"footerContentTemplate":
    '<div class="msls-vauto msls-footer-content msls-buttons-row">' +
    '</div>',

"contentTemplate":
    '<div data-role="content" class="msls-content">' +
    '</div>',

"popupTemplate":
    '<div data-role="popup" class="msls-popup">' +
        '<div class="msls-popup-content"></div>' +
        '<div class="msls-clear"></div>' +
    '</div>',

"modalViewTemplate":
    '<div class="msls-modalview msls-collapsed">' +
    '</div>'
};

var msls_ui_KeyboardDispatcher;
(function () {

    function KeyboardDispatcher(control, keyBindings) {
        var manager = this;
        manager.control = control;
        manager.setKeyBindings(keyBindings);
        this.control.getView().on("keydown",
            function (e) {
                return manager.handleKeyDown(e);
        });
    }

    msls_defineClass("ui.controls", "KeyboardDispatcher", KeyboardDispatcher, null, {
        handleKeyDown: function handleKeyDown(e) {
            return this.keyBindings[e.which] ?
                this.keyBindings[e.which](this.control, e, this) : true;
            },

        setKeyBindings: function setKeyBindings(newBindings) {
            this.keyBindings = $.extend({}, newBindings);
        },
    });

    msls_ui_KeyboardDispatcher = msls.ui.controls.KeyboardDispatcher;
}());

var SP,
    msls_sharepoint;

(function () {

    var hostUrl = msls_getClientParameter("SPHostUrl"),
        appWebUrl = msls_getClientParameter("SPAppWebUrl"),
        serverUrl, chromeColors = msls_getClientParameter("SPChromeColors"),
        chromeBackgroundColor, chromeLinkFontColor,
        scriptBase, suffix, promise,
        pendingRequestCallbacks;

    hostUrl = hostUrl ? decodeURIComponent(hostUrl) : null;
    appWebUrl = appWebUrl ? decodeURIComponent(appWebUrl) : null;

    if (!hostUrl || !appWebUrl) {
        return;
    }

    serverUrl = $.mobile.path.parseUrl(hostUrl).domain;

    chromeColors = chromeColors ? decodeURIComponent(chromeColors) : null;
    if (/^[0-9a-fA-F]{16}$/.test(chromeColors)) {
        chromeBackgroundColor = chromeColors.substring(2, 8);
        chromeLinkFontColor = chromeColors.substring(10, 16);
    }

    function getScript(url) {
        return $.ajax({
            url: url,
            cache: true,
            dataType: "script"
        });
    }

    msls_mark(msls_codeMarkers.loadSharePointStart);
    scriptBase = appWebUrl + "/_layouts/15/";
    suffix = ".js";
    promise = getScript(scriptBase + "SP.RequestExecutor" + suffix)
        .then(function () {
            return getScript(scriptBase + "SP.Runtime" + suffix);
        })
        .then(function () {
            return getScript(scriptBase + "SP" + suffix);
        })
        .then(function () {
            var context, factory;
            if (!(SP = window.SP) ||
                !SP.ProxyWebRequestExecutorFactory ||
                !SP.ClientObject || !SP.ClientContext) {
                return $.Deferred().reject();
            }
            context = new SP.ClientContext(appWebUrl);
            factory = new SP.ProxyWebRequestExecutorFactory(appWebUrl);
            context.set_webRequestExecutorFactory(factory);
            msls_sharepoint.context = context;
            msls_sharepoint.hostWeb = new SP.AppContextSite(context, hostUrl).get_web();
            msls_sharepoint.appWeb = new SP.AppContextSite(context, appWebUrl).get_web();
        })
        .always(function () {
            msls_mark(msls_codeMarkers.loadSharePointEnd);
        });

    var gifIconExtensions = {
        doc: true,
        ppt: true,
        xls: true,
        eml: true,
        dot: true,
        txt: true,
        htm: true,
        jpg: true,
        png: true,
        gif: true,
        zip: true,
        xps: true
    };
    var pngIconExtensions = {
        docx: true,
        pptx: true,
        xlsx: true,
        one: true,
        dotx: true,
        pdf: true
    };

    msls_sharepoint = {
        hostUrl: hostUrl,
        appWebUrl: appWebUrl,
        serverUrl: serverUrl,
        chromeBackgroundColor: chromeBackgroundColor,
        chromeLinkFontColor: chromeLinkFontColor,
        context: null,
        hostWeb: null,
        appWeb: null,
        ready: promise.then,
        processRequest: function (asyncResult) {
            var me = this, context = me.context, deferred = $.Deferred();
            if (!pendingRequestCallbacks) {
                pendingRequestCallbacks = [];
                setTimeout(function () {
                    context.executeQueryAsync(
                        function () {
                            var callbacks = pendingRequestCallbacks;
                            pendingRequestCallbacks = null;
                            callbacks.forEach(function (callback) {
                                callback();
                            });
                        },
                        function (error) {
                            var callbacks = pendingRequestCallbacks;
                            pendingRequestCallbacks = null;
                            callbacks.forEach(function (callback) {
                                callback(error);
                            });
                        }
                    );
                }, 0);
            }
            pendingRequestCallbacks.push(function (error) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve(asyncResult);
                }
            });
            return deferred.promise();
        },
        load: function () {
            var me = this, context = me.context, deferred = $.Deferred(),
                args = Array.prototype.slice.call(arguments, 0);
            args.forEach(function (o) {
                context.load(o);
            });
            context.executeQueryAsync(
                function success() {
                    deferred.resolve();
                },
                function failure(unused, e) {
                    deferred.reject(e);
                }
            );
            return deferred.promise();
        },
        getIconUrl: function (extension) {
            var prefix = this.serverUrl + "/_layouts/15/images/ic";
            if (extension === "html") {
                extension = "htm";
            }
            if (gifIconExtensions[extension]) {
                return prefix + extension + ".gif";
            } else if (pngIconExtensions[extension]) {
                return prefix + extension + ".png";
            } else {
                return prefix + "gen.gif";
            }
        }
    };

}());

var msls_addOrRemoveClass,
    msls_removeClasses,
    msls_addClasses,
    msls_createElement,
    msls_setText,
    msls_handleKeyDownForTapAction,
    msls_handleDialogFocus,
    msls_handleContainerKeyboardNavigation,
    msls_updateContainerFocusItem,
    msls_restoreScrollPosition;

(function () {

    var arraySlice = Array.prototype.slice,
        space = /\s+/;

    msls_addOrRemoveClass =
    function addOrRemoveCssClass(jQueryElement, condition, trueClassNames, falseClassNames) {
        var addClasses,
            removeClasses,
            i, l,
            element, className,
            stringLength, changed,
            c, cl;

        if (condition) {
            addClasses = !!trueClassNames ? trueClassNames.split(space) : null;
            removeClasses = !!falseClassNames ? falseClassNames.split(space) : null;
        } else {
            removeClasses = !!trueClassNames ? trueClassNames.split(space) : null;
            addClasses = !!falseClassNames ? falseClassNames.split(space) : null;
        }

        for (i = 0, l = jQueryElement.length; i < l; i++) {
            element = jQueryElement[i];

            if (element.nodeType === 1) {
                className = element.className;
                if (!className && !!addClasses && addClasses.length === 1) {
                    element.className = addClasses[0];
                } else {
                    changed = false;
                    className = (" " + className + " ").replace(space, " ");

                    if (addClasses) {
                        for (c = 0, cl = addClasses.length; c < cl; c++) {
                            if (addClasses[c] && className.indexOf(" " + addClasses[c] + " ") < 0) {
                                className += addClasses[c] + " ";
                                changed = true;
                            }
                        }
                    }
                    if (removeClasses) {
                        stringLength = className.length;
                        for (c = 0, cl = removeClasses.length; c < cl; c++) {
                            if (removeClasses[c]) {
                                className = className.replace(" " + removeClasses[c] + " ", " ");
                            }
                        }
                        if (className.length < stringLength) {
                            changed = true;
                        }
                    }
                    if (changed) {
                        element.className = $.trim(className);
                    }
                }
            }
        }
    };

    msls_addClasses =
    function addClasses($element) {
        $element.addClass(arraySlice.call(arguments, 1).join(" "));
    };

    msls_removeClasses =
    function addClasses($element) {
        $element.removeClass(arraySlice.call(arguments, 1).join(" "));
    };

    msls_createElement =
    function createElement(html) {
        var itemHolder = document.createElement("div");
        itemHolder.innerHTML = html;
        return itemHolder.firstChild;
    };

    msls_setText =
    function setText($element, text) {
        $element.empty();
        if (text) {
            $element[0].appendChild(document.createTextNode(text));
        }
    };

    msls_handleKeyDownForTapAction =
    function handleKeyDownForTapAction($element) {
        $element.keydown(function (e) {
            var jQueryMobileKeyCode = $.mobile.keyCode,
                keyCode = e.which;
            if (keyCode === jQueryMobileKeyCode.ENTER ||
                keyCode === jQueryMobileKeyCode.SPACE) {
                $(e.target).trigger("vclick");
                return false;
            }
            return;
        });
    };

    function isShown(element) {
        var $element = $(element);

        return $element.filter(":visible").length > 0 &&
            $element.parents().addBack().filter(function () {
                return $(this).css("visibility") === "hidden";
            }).length <= 0;
    }

    function canElementReceiveTabFocus() {
        var element = this,
            tabIndex = parseInt($.attr(element, html_tabIndex_Attribute), 10),
            tabIndexIsNumber = !isNaN(tabIndex),
            nodeName = element.nodeName.toLowerCase(),
            map, mapName, image;

        if (tabIndexIsNumber && tabIndex < 0) {
            return false;
        }

        if (nodeName === "area") {
            map = element.parentNode;
            mapName = map.name;
            if (!element.href || !mapName ||
                map.nodeName.toLowerCase() !== "map") {
                return false;
            }
            image = $("img[usemap=#" + mapName + "]")[0];
            return !!image && isShown(image);
        }

        return (
                /input|select|textarea|button|object/.test(nodeName) ?
                !element.disabled :
                nodeName === "a" ?
                    !!element.href || tabIndexIsNumber :
                    tabIndexIsNumber
            ) &&
            isShown(element);
    }

    msls_handleDialogFocus =
    function handleDialogFocus(dialog) {
        var dialogElement = dialog[0];

        dialog.focus();

        if (dialogElement._keyDownEventHooked) {
            return;
        }

        dialog.keydown(function (e) {
            if (e.keyCode !== $.mobile.keyCode.TAB) {
                return;
            }

            var target = e.target,
                shift = e.shiftKey,
                $canReceiveTabElements = $("*", dialog)
                    .filter(canElementReceiveTabFocus),
                $firstCanReceiveTab = $canReceiveTabElements.first(),
                $lastCanReceiveTab = $canReceiveTabElements.last();

            if ((target === $firstCanReceiveTab[0] ||
                target === dialogElement) &&
                shift) {

                $lastCanReceiveTab.focus();
                return false;

            } else if ((target === $lastCanReceiveTab[0] ||
                target === dialogElement) &&
                !shift) {

                $firstCanReceiveTab.focus();
                return false;
            }
        });

        dialogElement._keyDownEventHooked = true;
    };

    msls_handleContainerKeyboardNavigation =
    function handleContainerKeyboardNavigation($container, activeItemsSelector) {

        $(activeItemsSelector, $container).first()
            .attr(html_tabIndex_Attribute, "0");

        $container.keydown(function (e) {
            var jQueryMobileKeyCode = $.mobile.keyCode,
                keyCode = e.which;
            if (keyCode === jQueryMobileKeyCode.LEFT ||
                keyCode === jQueryMobileKeyCode.RIGHT) {

                var $activeItems = $(activeItemsSelector, $container),
                    $focusedItem = $(activeItemsSelector + ":focus", $container),
                    focusedItemIndex = $activeItems.index($focusedItem),
                    lastIndex = $activeItems.length - 1;


                if (keyCode === jQueryMobileKeyCode.LEFT) {
                    focusedItemIndex -= 1;
                } else {
                    focusedItemIndex += 1;
                }

                if (focusedItemIndex < 0) {
                    focusedItemIndex = lastIndex;
                } else if (focusedItemIndex > lastIndex) {
                    focusedItemIndex = 0;
                }

                $focusedItem.attr(html_tabIndex_Attribute, "-1");

                $focusedItem = $($activeItems[focusedItemIndex]);
                $focusedItem.attr(html_tabIndex_Attribute, "0");
                $focusedItem.focus();

                e.stopPropagation();
                e.preventDefault();
            }
        });
    };

    msls_updateContainerFocusItem =
    function updateContainerFocusItem($container, activeItemsSelector, $item) {

        var $activeItems = $(activeItemsSelector, $container),
            itemIsActive = $activeItems.index($item) >= 0,
            setFirstItemActive;

        if (itemIsActive) {
            setFirstItemActive = $activeItems.length === 1;
        } else {
            if ($item.attr(html_tabIndex_Attribute) === "0") {
                $item.attr(html_tabIndex_Attribute, "-1");
                setFirstItemActive = true;
            }
        }

        if (setFirstItemActive) {
            $activeItems.first().attr(html_tabIndex_Attribute, "0");
        }
    };

    msls_restoreScrollPosition =
    function restoreScrollPosition($container, scrollPosition) {
        if (scrollPosition > 0 && scrollPosition !== $container.scrollTop()) {
            msls_subscribeOnce(
                msls_shell_activeNavigationUnitChangedNotification,
                function () {
                    $container.scrollTop(scrollPosition);
                });
        }
    };


    function ObservableCssClass(elementOrJquery, trueClassName, falseClassName) {


        this._element = elementOrJquery;
        this._trueClassName = trueClassName;
        this._falseClassName = falseClassName;
    }

    msls_defineClass("ui.helpers", "ObservableCssClass", ObservableCssClass, null, {
        value: msls_observableProperty(null, function value_get() {

            function helper_isConsistentState(actualState, expectedState) {
                return (actualState === null) || actualState === expectedState;
            }

            var jQueryElement = $(this._element),
                hasTrueClass = !!this._trueClassName && jQueryElement.hasClass(this._trueClassName),
                hasFalseClass = !!this._falseClassName && jQueryElement.hasClass(this._falseClassName);


            if (helper_isConsistentState(hasTrueClass, true) && helper_isConsistentState(hasFalseClass, false)) {
                return true;
            } else if (helper_isConsistentState(hasTrueClass, false) && helper_isConsistentState(hasFalseClass, true)) {
                return false;
            }

            return null;

        }, function value_set(value) {
            var me = this,
                jQueryElement = $(me._element),
                trueClassName = me._trueClassName,
                falseClassName = me._falseClassName,
                onvaluechange = me.onvaluechange;

            if (trueClassName) {
                msls_addOrRemoveClass(jQueryElement, value, trueClassName);
            }

            if (falseClassName) {
                msls_addOrRemoveClass(jQueryElement, !value, falseClassName);
            }

            if ((!!trueClassName || !!falseClassName) && !!onvaluechange) {
                onvaluechange(jQueryElement);
            }
        })
    });


    msls_defineClass("ui.helpers", "ObservableVisibility", function ObservableVisibility(elementOrJquery) {

        ObservableCssClass.call(this, elementOrJquery, null, "msls-collapsed");
    }, ObservableCssClass, {});

}());

var msls_updateLayout,
    msls_updateLayoutImmediately,
    msls_suspendLayout,
    msls_resumeLayout,
    msls_layout_updatingNotification = "LayoutUpdating",
    msls_layout_updatedNotification = "LayoutUpdated",
    msls_getAvailableClientWidth,
    msls_getNodeWidth,
    msls_verticalScrollbarSize;

(function () {

    var currentLayout = [],
        currentLayoutIndex = 0,
        queueHandle = null,
        suspensionCount = 0,
        isolatedNodeList = null,
        nonIsolatedNodeList = null,
        fullUpdateRequested = false,
        forceUpdate = false,
        layoutUpdating = false,
        rootSelector = "body > div:not(.msls-layout-ignore):not(.ui-loader)",
        lastWindowWidth = -1,
        lastWindowHeight = -1,
        verticalScrollSize = 0,
        horizontalScrollSize = 0;



    msls_suspendLayout = function suspendLayout(keepLayoutQueue) {
        suspensionCount++;
        if (keepLayoutQueue) {
            if (queueHandle !== null) {
                msls_clearTimeout(queueHandle);
                queueHandle = null;
            }
        } else {
            _clearQueue();
        }
    };

    msls_resumeLayout = function resumeLayout(queueUpdate) {
        queueUpdate = typeof queueUpdate === "boolean" ? queueUpdate : true;
        suspensionCount--;
        if (queueUpdate) {
            _queue();
        }
    };

    msls_updateLayoutImmediately = function ($rootNodes, skipIfAlreadyUpdated) {
        nonIsolatedNodeList = $rootNodes ? $rootNodes : $(rootSelector);
        forceUpdate = !skipIfAlreadyUpdated;
        _invokeLayout();
    };

    function _invokeLayout() {
        var tempIsolatedNodes = isolatedNodeList,
            tempFullUpdateRequested = fullUpdateRequested,
            tempNonIsolatedNodes = nonIsolatedNodeList,
            tempForceUpdate = forceUpdate,
            $rootNodes;

        _clearQueue(true);
        if (tempFullUpdateRequested) {
            $rootNodes = $(rootSelector);
            updateLayoutCore($rootNodes, false, tempForceUpdate);
        } else if (!!tempNonIsolatedNodes) {
            updateLayoutCore(tempNonIsolatedNodes, false, tempForceUpdate);
        }
        if (!!tempIsolatedNodes) {
            updateLayoutCore(tempIsolatedNodes, true, true);
        }
    }

    var requestReceived = false;
    function _queue() {
        function _handleCallback() {
            if (requestReceived) {
                requestReceived = false;
                queueHandle = msls_setTimeout(_handleCallback, 1);
                return;
            }

            _invokeLayout();
        }

        if (queueHandle !== null) {
            requestReceived = true;
            return;
        }

        if (suspensionCount > 0) {
            return;
        }

        queueHandle = msls_setTimeout(_handleCallback, 1);

    }

    function _clearQueue(clearIsolatedNodes) {

        if (queueHandle !== null) {
            msls_clearTimeout(queueHandle);
            queueHandle = null;
        }
        requestReceived = false;
        if (clearIsolatedNodes) {
            isolatedNodeList = null;
        }
        nonIsolatedNodeList = null;
        fullUpdateRequested = false;
        forceUpdate = false;
    }

    msls_updateLayout =
    function updateLayout($rootNodes, skipIfAlreadyUpdated) {
        
        if (layoutUpdating) {
            return;
        }

        if (!$rootNodes) {
            if (!fullUpdateRequested && suspensionCount === 0) {
                fullUpdateRequested = true;
                msls_mark(msls_codeMarkers.layoutFullRequest);
            }
        } else {
            if ($rootNodes.first().closest(".msls-layout-ignore-children").length) {
                isolatedNodeList = !isolatedNodeList ? $rootNodes : isolatedNodeList.add($rootNodes);
                msls_mark(msls_codeMarkers.layoutPartialRequest);
            } else if (!fullUpdateRequested) {
                if (nonIsolatedNodeList) {
                    if ($rootNodes.filter(nonIsolatedNodeList).length !== $rootNodes.length) {
                        fullUpdateRequested = true;
                        forceUpdate = true;
                        msls_mark(msls_codeMarkers.layoutFullRequest);
                    }
                } else {
                    nonIsolatedNodeList = $rootNodes;
                    msls_mark(msls_codeMarkers.layoutPartialRequest);
                }
            }
        }
        if (!skipIfAlreadyUpdated) {
            forceUpdate = true;
        }

        requestReceived = false;
        _queue();
    };


    function isLayoutRoot($node) {
        return $node.length === 1 &&
            ($node.hasClass("ui-page") || $node.hasClass("msls-tab-content"));
    }

    function isLayoutUpToDate($node) {
        return isLayoutRoot($node) && $node.data("lastWindowWidth") === lastWindowWidth && $node.data("lastWindowHeight") === lastWindowHeight;
    }

    function markLayoutUpdated($node) {
        if (isLayoutRoot($node)) {
            $node.data("lastWindowWidth", lastWindowWidth);
            $node.data("lastWindowHeight", lastWindowHeight);
            if ($node.hasClass("ui-page")) {
                var tabRoot = $node.find(".msls-tab-content.msls-tab-content-active");
                tabRoot.data("lastWindowWidth", lastWindowWidth);
                tabRoot.data("lastWindowHeight", lastWindowHeight);
            }
        }
    }

    function updateLayoutCore($rootNodes, isolated, force) {

        if (suspensionCount > 0) {
            return;
        }
        if (layoutUpdating) {
            return;
        }

        if (isLayoutUpToDate($rootNodes)) {
            if (!force) {
                return;
            }
        } else {
            markLayoutUpdated($rootNodes);
        }

        try {
            layoutUpdating = true;
            msls_mark(msls_codeMarkers.layoutStart);
            msls_notify(msls_layout_updatingNotification, $rootNodes);

            $rootNodes = $rootNodes.filter(":visible");

            updateHeight($rootNodes, isolated);

            var columnLayoutsNeedUpdate = getEligibleColumnLayoutNodes($rootNodes, isolated),
                layoutPlan = getLayoutPlan(columnLayoutsNeedUpdate);

            updateWidth(layoutPlan);
            if (!isolated && verticalScrollSize !== 0) {
                updateWidth(layoutPlan);
            }
            msls_mark(msls_codeMarkers.layoutEnd);
            msls_notify(msls_layout_updatedNotification, $rootNodes);
            msls_mark(msls_codeMarkers.layoutEndNotified);
        } finally {
            layoutUpdating = false;
        }
    }

    function getLayoutPlan(layoutItems) {

        var parentIndexList = [],
            dependentCountList = [],
            executionIndex = [],
            executionPlan = [],
            itemCount,
            parentNode,
            currentParentIndex,
            i,
            layerStart, layerEnd,
            leftCount;


        itemCount = layoutItems.length;
        for (i = 0; i < itemCount; i++) {
            layoutItems[i].msls_layout_index = i + 1;
            parentIndexList[i] = -1;
            dependentCountList[i] = 0;
        }

        for (i = itemCount - 1; i >= 0; i--) {
            parentNode = layoutItems[i].parentNode;
            while (parentNode) {
                currentParentIndex = parentNode.msls_layout_index;
                if (currentParentIndex) {
                    parentIndexList[i] = --currentParentIndex;
                    dependentCountList[currentParentIndex]++;
                    break;
                }
                parentNode = parentNode.parentNode;
            }
            layoutItems[i].msls_layout_index = 0;
        }

        leftCount = itemCount;

        layerStart = 0;
        for (i = itemCount - 1; i >= 0; i--) {
            if (dependentCountList[i] === 0) {
                executionIndex.push(i);
                leftCount--;
            }
        }

        while (leftCount > 0) {
            layerEnd = executionIndex.length;

            if (layerEnd === layerStart) {
                break;
            }

            executionIndex.push(-1);

            for (i = layerStart; i < layerEnd; i++) {
                currentParentIndex = parentIndexList[executionIndex[i]];
                if (currentParentIndex >= 0) {
                    if (--dependentCountList[currentParentIndex] === 0) {
                        executionIndex.push(currentParentIndex);
                        leftCount--;
                    }
                }
            }

            layerStart = layerEnd + 1;
        }

        for (i = executionIndex.length - 1; i >= 0; i--) {
            executionPlan.push(executionIndex[i] >= 0 ? layoutItems[executionIndex[i]] : null);
        }
        executionPlan.push(null);
        return executionPlan;
    }

    function executeChangeQueue(changeQueue) {
        for (var i = 0; i < changeQueue.length; i++) {
            changeQueue[i].call();
        }
    }

    function updateHeight(rootNodes, isolated) {

        var vStretchElements = rootNodes.filter(".msls-vstretch").add($(".msls-vstretch", rootNodes));
        if (!isolated){
            vStretchElements = vStretchElements.not(".msls-layout-ignore-children .msls-vstretch, .msls-columns-layout > .msls-vstretch");
        }
        vStretchElements = vStretchElements.filter(":visible");

        $.each(vStretchElements, function () {
            $(this.parentNode).data("msls-rows-updated", false);
        });

        var layoutPlan = getLayoutPlan(vStretchElements),
            changeQueue = [];

        layoutPlan.forEach(function (layoutNode) {

            if (!layoutNode) {
                executeChangeQueue(changeQueue);
                changeQueue = [];
                return;
            }

            var parentNode = layoutNode.parentNode,
                totalSiblingsHeight = 0,
                parentHeight,
                totalAvailableHeight,
                weightedTotal;

            if (!!$(parentNode).data("msls-rows-updated")) {
                return;
            }

            $.each(getVAutoNodes(parentNode), function () {
                totalSiblingsHeight += getNodeHeight(this);
            });

            weightedTotal = 0.0;
            parentHeight = getAvailableChildHeight(parentNode);
            totalAvailableHeight = parentHeight - totalSiblingsHeight;
            
            var rows = $(parentNode).children(".msls-vstretch").filter(":visible");
            $.each(rows, function () {
                weightedTotal += getWeight(this);
            });

            arrangeRows(parentNode, rows, totalAvailableHeight, weightedTotal, changeQueue);
            $(parentNode).data("msls-rows-updated", true);
        });
    }

    function arrangeRows(parentNode, filteredRows, totalAvailableHeight, weightedTotal, changeQueue) {

        $.each(filteredRows, function () {
            var row = this,
                node = $(this),
                isParentVStretch, weight, computedStyle, minHeight,
                desiredHeight, margin, padding, border, boxSizingMode,
                isContentBox, isPaddingBox;

            isParentVStretch = $(parentNode).hasClass("msls-columns-layout") || parentNode.tagName === "BODY";
            weight = getWeight(this);
            computedStyle = window.getComputedStyle(this);
            minHeight = parseFloat(computedStyle.minHeight);
            desiredHeight = totalAvailableHeight * (isParentVStretch ? 1 : (weight / weightedTotal));
            margin = parseFloat(computedStyle.marginTop) + parseFloat(computedStyle.marginBottom);
            padding = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
            border = parseFloat(computedStyle.borderTopWidth) + parseFloat(computedStyle.borderBottomWidth);

            desiredHeight -= margin;

            if (desiredHeight < 0) {
                desiredHeight = 0;
            }

            if (desiredHeight < padding + border) {
                desiredHeight = padding + border;
            }

            boxSizingMode = getBoxSizingMode(computedStyle);
            isContentBox = boxSizingMode === "content-box";
            isPaddingBox = boxSizingMode === "padding-box";

            desiredHeight -= ((isPaddingBox || isContentBox) ? parseFloat(computedStyle.borderTopWidth) + parseFloat(computedStyle.borderBottomWidth) : 0) +
                             (isContentBox ? parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom) : 0);
            desiredHeight = Math.floor(desiredHeight);

            var heightSetting = desiredHeight + "px";
            if (row.style.height !== heightSetting) {
                changeQueue.push(function () {
                    row.style.height = heightSetting;

                });
            }
        });
    }

    function getEligibleColumnLayoutNodes(rootNodes, isolated) {
        var columnLayouts = rootNodes.filter(".msls-columns-layout:not(.msls-static-layout)")
                                .add($(".msls-columns-layout:not(.msls-static-layout)", rootNodes)),
            filteredColumnLayouts = [];

        if (!isolated) {
            columnLayouts = columnLayouts.not(".msls-layout-ignore-children .msls-columns-layout");
        }
        columnLayouts = columnLayouts.filter(":visible");

        $.each(columnLayouts, function () {
            var node = $(this);

            if (!!node.children(".msls-hstretch").length || node.hasClass("msls-dynamic-padding")) {
                filteredColumnLayouts.push(this);
            }
        });
        return $(filteredColumnLayouts);
    }

    function updateWidth(columnLayouts) {
        var changeQueue = [];

        columnLayouts.forEach(function (layoutNode) {

            if (!layoutNode) {
                executeChangeQueue(changeQueue);
                changeQueue = [];
                return;
            }

            var node = $(layoutNode),
                availableWidth = getAvailableChildWidth(layoutNode);


            arrangeColumns(layoutNode, availableWidth, changeQueue);
        });
    }

    function arrangeColumns(parentNode, parentWidth, changeQueue) {

        var totalSiblingWidth = 0,
            weight,
            requiredWidth,
            weightedTotal = 0,
            totalAvailableWidth,
            overflowColumns,
            columns = [],
            columnDetails,
            rowData,
            hasStretch = false,
            allChildren = parentNode.children;

        if (allChildren.length === 0) {
            return;
        }

        $.each(allChildren, function () {
            var node = $(this);
            if (node.hasClass("msls-hauto")) {
                requiredWidth = msls_getNodeWidth(this);
                totalSiblingWidth += requiredWidth;
                columns.push({
                    element: this,
                    isAuto: true,
                    requiredWidth: requiredWidth
                });
            } else if (node.hasClass("msls-hstretch")) {
                weight = getWeight(this);
                weightedTotal += weight;
                columns.push({
                    element: this,
                    isAuto: false,
                    weight: weight
                });
                hasStretch = true;
            }
        });

        if (hasStretch) {
            totalAvailableWidth = parentWidth - totalSiblingWidth;
            totalAvailableWidth = totalAvailableWidth > 0 ? totalAvailableWidth : 0;

            columnDetails = [];
            hasStretch = false;
            overflowColumns = $(parentNode).hasClass("msls-overflow-columns");

            $.each(columns, function (index) {
                var element = this.element,
                    node = $(element);

                if (element.offsetWidth !== 0 || element.offsetHeight !== 0) {
                    var computedStyle = window.getComputedStyle(element),
                        margin = parseFloat(computedStyle.marginLeft) + parseFloat(computedStyle.marginRight),
                        minWidth = 0;

                    if (this.isAuto) {
                        requiredWidth = this.requiredWidth;
                    } else {
                        weight = this.weight;
                        requiredWidth = (totalAvailableWidth) * (weight / weightedTotal);
                        minWidth = parseFloat(computedStyle.minWidth);
                        if (overflowColumns && requiredWidth < minWidth) {
                            requiredWidth = minWidth;
                        }
                        hasStretch = true;
                    }
                    this.totalWidth = Math.floor(requiredWidth + margin);

                    columnDetails.push(this);
                }
            });

            if (hasStretch) {
                if (overflowColumns) {
                    rowData = splitColumns(columnDetails, parentWidth);

                    $.each(rowData, function () {
                        fitColumnsIntoRow(this, parentWidth, overflowColumns, changeQueue);
                    });
                } else {
                    $.each(columnDetails, function () {
                        if (!this.isAuto) {
                            setWidth(this.element, this.totalWidth, overflowColumns, changeQueue);
                        }
                    });
                }
            }
        }
        if ($(parentNode).hasClass("msls-dynamic-padding")) {
            setColumnClasses(parentNode, changeQueue);
        }
    }

    function splitColumns(columnsToSplit, rowWidth) {

        var i = 0,
            row = 0,
            remainingWidth,
            rowData = [];

        while (i < columnsToSplit.length) {
            remainingWidth = rowWidth;

            var items = [];
            do {
                var column = columnsToSplit[i];

                if (items.length === 0 || column.totalWidth <= remainingWidth) {
                    items.push(column);
                    remainingWidth -= column.totalWidth;
                    i++;
                } else {
                    break;
                }
            } while (i < columnsToSplit.length);

            rowData.push(items);
            row++;
        }

        return rowData;
    }

    function fitColumnsIntoRow(columnsToFit, availableWidth, isOverflowing, changeQueue) {


        var hstretchColumns = [],
            totalAutoColumnWidth = 0,
            totalStretchColumnWidth = 0,
            totalWeight = 0,
            netAvailableWidth = 0;

        $.each(columnsToFit, function (columnIndex) {
            var isFirst = columnIndex === 0,
                isLast = columnIndex === columnsToFit.length - 1,
                nextSibling = $(this.element.nextSibling);
            if (this.isAuto) {
                totalAutoColumnWidth += this.totalWidth;
            } else {
                totalStretchColumnWidth += this.totalWidth;
                hstretchColumns.push(this);
                totalWeight += this.weight;
            }
            if (nextSibling.hasClass("msls-hempty")) {
                changeQueue.push(function () {
                    msls_addOrRemoveClass(nextSibling, isLast, "msls-clear");
                });
            }
        });

        netAvailableWidth = availableWidth - totalAutoColumnWidth - totalStretchColumnWidth;

        $.each(hstretchColumns, function () {
            var idealWidth = (availableWidth - totalAutoColumnWidth) * (this.weight / totalWeight),
                difference = idealWidth - this.totalWidth,
                width = this.totalWidth;
            difference = difference > netAvailableWidth ? netAvailableWidth : difference;
            if (difference > 0) {
                width += difference;
                netAvailableWidth -= difference;
            }
            setWidth(this.element, width, isOverflowing, changeQueue);
        });
    }

    function setColumnClasses(parentNode, changeQueue) {
        var children = [],
            rowIndexTotal = -1,
            childrenData = [],
            isOverflowing = false;

        $(parentNode).children(":visible").each(function () {
            var node = $(this);
            if (node.hasClass("msls-hauto") || node.hasClass("msls-hstretch")) {
                childrenData.push({
                    element: this,
                    offsetTop: this.offsetTop,
                    rowIndex: 0,
                    addClassString: "",
                    removeClassString: ""
                });
            }
        });

        if (childrenData.length === 0) {
            return;
        }

        isOverflowing = childrenData[0].offsetTop !== childrenData[childrenData.length - 1].offsetTop;
        $.each(childrenData, function (index) {
            if (isOverflowing) {
                this.addClassString += " msls-overflow";
            } else {
                this.removeClassString += " msls-overflow";
            }
        });

        changeQueue.push(function () {
            $.each(childrenData, function () {
                msls_addOrRemoveClass($(this.element), true, this.addClassString, this.removeClassString);
            });
        });
    }

    function getVAutoNodes(parentNode) {
        var node = $(parentNode);

        if (!node.hasClass("msls-columns-layout")) {
            return node.children(".msls-vauto");
        } else {
            return [];
        }
    }

    function getWeight(element) {
        var weight,
            weightRaw = $(element).attr("data-msls-weight");
        if (weightRaw) {
            weight = parseFloat(weightRaw);
        } else {
            weight = 1;
        }
        return weight;
    }

    function getNodeHeight(element) {
        var result = 0,
            margin = 0,
            style = window.getComputedStyle(element),
            styleHeight = parseFloat(style.height);
        
        result = element.offsetHeight + (isNaN(styleHeight) ? 0 : styleHeight - Math.round(styleHeight));

        margin = parseFloat(style.marginTop) + parseFloat(style.marginBottom);
        if (!isNaN(margin) && margin > 0) {
            result += margin;
        }

        return Math.ceil(result);
    }

    msls_getNodeWidth =
    function getNodeWidth(element) {

        var result = 0,
            margin = 0,
            style = window.getComputedStyle(element),
            styleWidth = parseFloat(style.width);

        result = element.offsetWidth + (isNaN(styleWidth) ? 0 : styleWidth - Math.round(styleWidth));

        margin = parseFloat(style.marginLeft) + parseFloat(style.marginRight);
        if (!isNaN(margin) && margin > 0) {
            result += margin;
        }

        return Math.ceil(result);
    };


    function getAvailableChildWidth(element) {

        var result = 0,
            style = window.getComputedStyle(element),
            styleWidth = parseFloat(style.width);

        result = element.clientWidth + (isNaN(styleWidth) ? 0 : styleWidth - Math.round(styleWidth));
        result -= parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);

        result = isNaN(result) ? 0 : result;
        return Math.floor(result);
    }
    msls_getAvailableClientWidth = getAvailableChildWidth;


    function getAvailableChildHeight(element) {

        var result = 0,
            style = window.getComputedStyle(element),
            styleHeight = parseFloat(style.height);

        result = element.clientHeight + (isNaN(styleHeight) ? 0 : styleHeight - Math.round(styleHeight));
        result -= parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);

        result = isNaN(result) ? 0 : result;
        return Math.floor(result);
    }

    function setWidth(element, width, isOverflowing, changeQueue) {

        var computedStyle = window.getComputedStyle(element),
            resultingWidth = width,
            minWidth = parseFloat(computedStyle.minWidth),
            boxSizingMode = getBoxSizingMode(computedStyle),
            isContentBox = boxSizingMode === "content-box",
            isPaddingBox = boxSizingMode === "padding-box";

        resultingWidth -= parseFloat(computedStyle.marginLeft) + parseFloat(computedStyle.marginRight) +
            ((isPaddingBox || isContentBox) ? parseFloat(computedStyle.borderLeftWidth) + parseFloat(computedStyle.borderRightWidth) : 0) +
            (isContentBox ? parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight) : 0);
        resultingWidth = Math.floor(resultingWidth);

        var widthSetting = resultingWidth + "px";
        if (element.style.width !== widthSetting) {
            changeQueue.push(function () {
                element.style.width = widthSetting;
            });
        }
        if (!isOverflowing && minWidth > resultingWidth) {
            if (element.style.minWidth !== widthSetting) {
                changeQueue.push(function () {
                    element.style.minWidth = widthSetting;

                });
            }
        }
    }

    function getBoxSizingMode(computedStyle) {
        return computedStyle.boxSizing ||
            computedStyle.MozBoxSizing ||
            computedStyle.webkitBoxSizing;
    }

    function findAffectedSubtree(element) {

        var current = element,
            className,
            verticalClosest,
            horizontalClosest;

        while (!!current && (!verticalClosest || !horizontalClosest)) {
            if (current.tagName === "LI") {
                verticalClosest = horizontalClosest = current;
            } else {
                className = (" " + current.className + " ").replace(/\s+/, " ");
                if (!verticalClosest && (className.indexOf(" msls-vstretch ") >= 0 || className.indexOf(" msls-fixed-height ") >= 0)) {
                    verticalClosest = current;
                    horizontalClosest = horizontalClosest && current;
                }
                if (!horizontalClosest && (className.indexOf(" msls-hstretch ") >= 0 || className.indexOf(" msls-fixed-width ") >= 0)) {
                    horizontalClosest = current;
                    verticalClosest = verticalClosest && current;
                }
            }
            current = current.parentNode;
        }
        current = horizontalClosest || verticalClosest;
        if (!current) {
            return null;
        }
        return $(current);
    }

    $(function () {
        var $window = $(window);

        lastWindowWidth = $window.width();
        lastWindowHeight = $window.height();

        window.addEventListener("resize", function () {
            var width = $window.width(),
                height = $window.height();
            if (width !== lastWindowWidth || height !== lastWindowHeight) {
                lastWindowWidth = width;
                lastWindowHeight = height;
                msls_updateLayout();
            }
        }, false);
    });

    function _calculateEffectiveScrollbarWidth() {
        var $body = $("body"),
            $div1 = $('<div style="height: 100px; width: 100px; visibility: hidden" class="msls-vscroll msls-hscroll"></div>').appendTo($body),
            $div2 = $('<div style="height: 200px; width: 200px;"></div>').appendTo($div1);

        msls_verticalScrollbarSize = verticalScrollSize = $div1[0].offsetHeight - $div1[0].clientHeight;
        horizontalScrollSize = $div1[0].offsetWidth - $div1[0].clientWidth;
        $div1.remove();
    }

    $(document).ready(function () {
        _calculateEffectiveScrollbarWidth();
        $("body").on("updatelayout", function (e) {
            if (!!e.target && e.target.tagName === "UL") {
                return;
            }
            var subtreeToUpdate = findAffectedSubtree(e.target);
            if (subtreeToUpdate) {
                msls_updateLayout(subtreeToUpdate);
            }
        });
    });
}());

var
    msls_ui_Control,
    msls_getTemplateItemPath,
    msls_getTemplateItem,
    msls_control_find,
    msls_controlProperty,
    msls_bind_clickEvent;

(function () {

    var _lastDispatcherId = 0,
        clickActionExecutedNotification = "clickActionExecuted";


    function defineControlPropertyOn(target, propertyName) {
        var targetClass = target.constructor,
            descriptor = this, mixContent = {},
            underlyingPropertyName,
            onChanged = descriptor.onChanged,
            needPropertyEvents = descriptor.needPropertyEvents,
            contentItemProperty = descriptor.contentItemProperty;

        if (needPropertyEvents) {
            msls_makeObservable(targetClass);
            mixContent[propertyName + "_" + msls_changeEventType] = msls_event(true);
        }

        underlyingPropertyName = "__" + propertyName;
        if (descriptor.initialValue !== undefined) {
            mixContent[underlyingPropertyName] = {
                enumerable: !msls_isLibrary,
                value: descriptor.initialValue
            };
        }
        mixContent[propertyName] = msls_accessorProperty(
            function controlProperty_get() {
                return this[underlyingPropertyName];
            },
            function controlProperty_set(value) {
                if (this[underlyingPropertyName] !== value) {
                    msls_setProperty(this, underlyingPropertyName, value);
                    if (onChanged) {
                        onChanged.call(this, value);
                    }
                    if (needPropertyEvents) {
                        var me = this;
                        me.dispatchChange(propertyName);
                    }
                }
            }
        );

        msls_mixIntoExistingClass(targetClass, mixContent);
    }

    msls_controlProperty =
    function controlProperty(onChanged, initialValue, needPropertyEvents) {
        return {
            onChanged: onChanged,
            initialValue: initialValue,
            needPropertyEvents: needPropertyEvents,
            defineOn: defineControlPropertyOn
        };
    };


    function Control(view) {

        var me = this;


        me.children = [];

        if (!view || !view.length) {
            me._view = $("<div />");
        }

        me._view = view;
    }

    function _registerTapAction() {

        var me = this,
            uiElement = me._tapElement;

        if (me._isViewCreated && !!me.tap) {

            if (!uiElement) {
                uiElement = me.getView();
            }

            msls_bind_clickEvent(uiElement, me, "tap", "ButtonClickPromise");

            uiElement.addClass("msls-tap");

            msls_handleKeyDownForTapAction(uiElement);
        }
    }

    function _onDispose() {
        var me = this,
            children = me.children,
            child,
            i, len,
            contentItem = me.data;

        if (!!contentItem && $.isFunction(contentItem._customViewDisposeHandler)) {
            contentItem._customViewDisposeHandler();
            contentItem._customViewDisposeHandler = null;
        }

        me.children = null;
        for (i = 0, len = children.length; i < len; i++) {
            child = children[i];
            child._parent = null;
            msls_dispose(child);
        }

        me.parent = null;

        me.__tap = null;
        me.__data = null;

    }

    function getView() {

        return this._view;
    }

    function attachView(templateData) {
        if (!this._isViewCreated) {
            this._isViewCreated = true;
            this._attachViewCore(templateData);
            this.isRendered = true;
        }
    }

    function render() {

        if (!this._isViewCreated) {
            var constructor = this.constructor,
                templateData = {},
                fillTemplate = constructor._fillTemplate;

            if (fillTemplate) {
                fillTemplate(this.getView(), this.data, templateData);
            }

            this.attachView(templateData);
        }
    }

    function _fillTemplate(view, contentItem, templateData) {
    }

    function _attachViewCore(templateData) {


        this._registerTapAction();
    }


    msls_defineClass("ui", "Control", Control, null, {
        controlName: "Undefined",
        data: msls_controlProperty(
            function onDataChanged(value) {
                if (this._onDataChanged) {
                    this._onDataChanged(value);
                }
            }, null),

        isRendered: msls_observableProperty(false),

        tap: msls_controlProperty(
            function onTapChanged(value) {
                if (this._isViewCreated) {
                    this._registerTapAction();
                }
            }),
        parent: msls_accessorProperty(
            function parent_get() {
                return this._parent;
            },
            function parent_set(value) {

                var index;

                if (this._parent !== value) {
                    if (!!this._parent && !!this._parent.children) {
                        index = this._parent.children.indexOf(this);
                        if (index >= 0) {
                            this._parent.children.splice(index, 1);
                        }
                    }
                    this._parent = value;
                    if (!!value) {
                        this._parent.children.push(this);
                    }
                }
            }
        ),
        _onDispose: _onDispose,
        getView: getView,
        attachView: attachView,
        render: render,
        _attachViewCore: _attachViewCore,
        _registerTapAction: _registerTapAction
    }, {
        _fillTemplate: _fillTemplate,
        _skipEnhance: false // Flag that tells if the view need to be enhanced by JQM or not. Default value is false.
    });

    msls_ui_Control = msls.ui.Control;
    msls_ui_Control.prototype._propertyMappings = {
    };
    msls_ui_Control.prototype._editableProperties = {
    };


    msls_getTemplateItemPath =
    function getTemplateItemPath(parentView, item) {

        var rootNode = parentView[0],
            itemNode = item[0],
            items = [],
            path = [],
            index;

        while (itemNode !== rootNode && !!itemNode) {
            items.push(itemNode);
            itemNode = itemNode.parentNode;
        }

        if (!!itemNode) {
            while (items.length > 0) {
                itemNode = items.pop();
                rootNode = rootNode.firstChild;
                index = 0;
                while (rootNode !== itemNode) {
                    rootNode = rootNode.nextSibling;
                    index++;
                }
                path.push(index);
            }
        }
        return path;
    };

    msls_getTemplateItem =
    function getTemplateItem(node, templateItemPath, fallbackSelector) {
        if (!templateItemPath || !templateItemPath.length) {
            if (templateItemPath === undefined && !!fallbackSelector) {
                return msls_control_find(node, fallbackSelector);
            }
            return node;
        }

        var len = templateItemPath.length,
            i,
            index,
            currentNode = node[0];

        for (i = 0; i < len && !!currentNode; i++) {
            index = templateItemPath[i];
            currentNode = currentNode.firstChild;
            while (index > 0 && !!currentNode) {
                currentNode = currentNode.nextSibling;
                index--;
            }
        }

        return $(currentNode);
    };

    msls_control_find =
    function findIncludingSelf(node, selector) {
        return node.is(selector) ? node : node.find(selector);
    };

    var excludedTagNames = { a: null, input: null, textarea: null };

    msls_bind_clickEvent = function (uiElement, control, actionPropertyName, notificationType, filter) {

        uiElement.off("touchend").on("touchend", function () { });

        uiElement.off("vclick").on("vclick", function (e) {

            msls_mark(msls_codeMarkers.userTap);

            var controls = [], currentControl = control;
            do {
                controls.push(currentControl);
                currentControl = currentControl.parent;
            } while (currentControl);
            do {
                currentControl = controls.pop();
                if (currentControl._onBeforeTap) {
                    if (currentControl._onBeforeTap(e) === false) {
                        return;
                    }
                }
            } while (controls.length);

            var action = control[actionPropertyName];
            if (!!action && action.canExecute) {
                var target = e.target,
                    targetTag = target.tagName.toLowerCase();

                if ((!filter || filter(e)) && (!(targetTag in excludedTagNames) || (targetTag === "a" && !target.href))) {

                    var data = control.data,
                        disabled = data.isEnabled === false;

                    if (!disabled) {
                        msls_mark(msls_codeMarkers.executeActionStart);

                        control.getView().addClass(msls_executing);

                        msls_notify(notificationType,
                            action.execute({ originalEvent: e })._thenEx(
                                function (error, result) {
                                    msls_notify(clickActionExecutedNotification, {
                                        control: control,
                                        result: result,
                                        error: error
                                    });
                                    if (!!error) {
                                        msls_modal_showError(error);
                                    }

                                    control.getView().removeClass(msls_executing);
                                    msls_mark(msls_codeMarkers.executeActionEnd);
                                }
                            )
                        );
                    }
                }
                if (!!e.originalEvent && e.originalEvent.type !== "click") {
                    e.preventDefault();
                }
                e.stopPropagation();
            }
        });
    };

    msls_defineEnum("ui", {
        Orientation: {
            horizontal: "horizontal",
            vertical: "vertical"
        }
    });

}());

var msls_setTextBoxMaxLength;

(function () {

    var control_attachViewCore = msls.ui.Control.prototype._attachViewCore,
        msls_builtIn_iconProperty = msls_getControlPropertyId("Icon", "RootCommand"),
        _Orientation = msls.ui.Orientation,
        _Button;


    (function () {
        function Text(view) {

            var me = this;
            msls_ui_Control.call(me, view);
        }

        function _refreshView(notify) {
            if (this._isViewCreated) {
                msls_setText(this._textElement, this.text);
                if (notify) {
                    this._textElement.trigger("updatelayout");
                }
            }
        }

        function _fillTemplate(view, contentItem, templateData) {

            $('<div class="msls-text"><span class="id-element"></span></div>').appendTo(view);
            templateData.idElement = msls_getTemplateItemPath(view, msls_control_find(view, ".id-element"));
        }

        function _attachViewCore(templateData) {
            control_attachViewCore.call(this, templateData);
            this._textElement = msls_getTemplateItem(this.getView(), templateData.idElement, ".id-element");
            this._refreshView();
        }

        msls_defineClass("ui.controls", "Text", Text, msls_ui_Control, {
            controlName: "Text",
            text: msls_controlProperty(
                function onTextChanged(value) {
                    this._refreshView(true);
                }, null, true),

            _attachViewCore: _attachViewCore,
            _refreshView: _refreshView
        }, {
            _fillTemplate: _fillTemplate,
            _skipEnhance: true
        });

        msls.ui.controls.Text.prototype._propertyMappings = {
            stringValue: "text",
            properties: {
                tap: "tap"
            }
        };

    }());


    (function () {
        function TextBox(view) {

            var me = this;
            msls_ui_Control.call(me, view);
            me._updatingText = false;
        }

        function _fillTemplate(view, contentItem, templateData) {
            var textElement = $('<input type="text" class="id-element" data-mini="true"></input>').appendTo(view);

            if (contentItem.maxLength) {
                msls_setTextBoxMaxLength(textElement, contentItem.maxLength);
            }
            templateData.idElement = msls_getTemplateItemPath(view, textElement);
        }

        function _attachViewCore(templateData) {

            var me = this;

            function updateText() {
                me._updatingText = true;
                me.text = me._textElement.val();
                me._updatingText = false;
            }
            
            me._textElement = msls_getTemplateItem(me.getView(), templateData.idElement, ".id-element");
            if (me.placeholderText) {
                me._textElement.attr("placeholder", me.placeholderText);
            }
            control_attachViewCore.call(me, templateData);

            me._textElement.keydown(function (e) {
                if (e.keyCode === $.mobile.keyCode.ENTER) {
                    updateText();
                }
            });

            me._textElement.change(updateText);
            me._refreshView();
        }

        function _refreshView() {
            if (!this._isViewCreated) {
                return;
            }

            if (!this._updatingText || this._textElement.val() !== this.text) {
                this._textElement.val(this.text);
            }
        }

        function _onTextChanged() {
            this._refreshView();
        }

        msls_setTextBoxMaxLength =
        function setTextBoxMaxLength($textElement, maxLength) {
            if (maxLength) {
                $textElement.attr("maxlength", maxLength.toString());
            } else {
                if ($textElement.attr("maxlength")) {
                    $textElement.removeAttr("maxlength");
                }
            }
        };

        function _customVisualStateHandler(e) {
            
            if (e.state === msls_VisualState.disabled) {
                var $element = this._textElement;
                if (this._isViewCreated && !!$element) {
                    if ($element.data("mobile-textinput")) {
                        $element.textinput(e.activate ? "disable" : "enable");
                    } else {
                        if (e.activate) {
                            $element.attr("disabled", "disabled");
                        } else {
                            $element.attr("disabled", "");
                        }
                    }
                }

                e.custom = true;
            }
        }

        var textBox = msls_defineClass("ui.controls", "TextBox", TextBox, msls_ui_Control, {
            controlName: "TextBox",
            text: msls_controlProperty(
                function onTextChanged(value) {
                    this._onTextChanged();
                },
                null, true),
            placeholderText: msls_controlProperty(),
            _attachViewCore: _attachViewCore,
            _refreshView: _refreshView,
            _customVisualStateHandler: _customVisualStateHandler,
            _onTextChanged: _onTextChanged
        }, {
            _fillTemplate: _fillTemplate,
            _isFormElement: true
        });

        textBox.prototype._propertyMappings = {
            stringValue: "text",
            properties: {
                placeholderText: "placeholderText"
            }
        };

        textBox.prototype._editableProperties = {
            text: "stringValue"
        };
    }());


    (function () {
        var _BaseClass = msls.ui.controls.TextBox,
            textBoxAttachViewCore = _BaseClass.prototype._attachViewCore;

        function TextArea(view) {
            _BaseClass.call(this, view);
        }

        function _fillTemplate(view, contentItem, templateData) {
            $('<textarea class="id-element" data-mini="true"></textarea>').appendTo(view);
            templateData.idElement = msls_getTemplateItemPath(view, msls_control_find(view, ".id-element"));
        }

        function _attachViewCore(templateData) {
            textBoxAttachViewCore.call(this, templateData);

            var textElement = this._textElement;
            msls_addAutoDisposeNotificationListener(msls_layout_updatingNotification, this, function () {
                textElement.keyup();
            });
        }

        msls_defineClass("ui.controls", "TextArea", TextArea, _BaseClass, {
            controlName: "TextArea",
            _attachViewCore: _attachViewCore,
            _onDispose:  function _onDispose() {
                this._textElement.remove();
            }
        }, {
            _fillTemplate: _fillTemplate,
            _isFormElement: true
        });

        msls.ui.controls.TextArea.prototype._propertyMappings = {
            stringValue: "text",
            properties: {
                placeholderText: "placeholderText"
            }
        };
    }());


    (function () {

        function Button(view) {

            msls_ui_Control.call(this, view);
        }

        function _fillTemplate(view, contentItem, templateData) {

            var element = $('<a tabIndex="0" class="id-element" data-role="button" data-mini="true" data-theme="' + cssDefaultJqmTheme + '"/>').appendTo(view);
            templateData.idElement = msls_getTemplateItemPath(view, element);
        }

        function _attachViewCore(templateData) {
            var view = this.getView();
            this._element = msls_getTemplateItem(view, templateData.idElement, ".id-element");

            control_attachViewCore.call(this, templateData);

            this._refreshView();
        }

        function _refreshView() {
            var me = this;

            if (!me._isViewCreated) {
                return;
            }


            me._element.text(me.content);

            if (me._element.data("mobile-button")) {
                me._element.trigger("refresh");
            }

            me._initialized = true;
        }

        function _customVisualStateHandler(e) {

            var element = this._element;
            if (element && element.hasClass(ui_disabled)) {
                element.removeClass("ui-btn-hover-a");
            }
        }

        msls_defineClass("ui.controls", "Button", Button, msls_ui_Control, {
            controlName: "Button",
            content: msls_controlProperty(
                function onContentChanged(value) {
                    this._refreshView();
                }),
            _attachViewCore: _attachViewCore,
            _refreshView: _refreshView,
            _customVisualStateHandler: _customVisualStateHandler
        }, {
            _fillTemplate: _fillTemplate
        });

        msls.ui.controls.Button.prototype._propertyMappings = {
            displayName: "content",
            properties: {
                tap: "tap",
                hiddenIfDisabled: "hiddenIfDisabled"
            }
        };

    }());
    _Button = msls.ui.controls.Button;


    (function () {

        function NegativeTabIndexButton(view) {

            _Button.call(this, view);
        }

        function _fillTemplate(view, contentItem, templateData) {
            var element = $('<a tabIndex="-1" class="id-element" data-role="button" data-mini="true" data-theme="' + cssDefaultJqmTheme + '"/>').appendTo(view);
            templateData.idElement = msls_getTemplateItemPath(view, element);
        }

        msls_defineClass("ui.controls", "NegativeTabIndexButton", NegativeTabIndexButton, _Button, {
            controlName: "NegativeTabIndexButton"
        }, {
            _fillTemplate: _fillTemplate
        });
    }());


    (function () {

        function CommandBarButton(view) {

            _Button.call(this, view);
        }

        function _fillTemplate(view, contentItem, templateData) {
            var $element = $('<div class="id-element msls-large-icon" tabIndex="-1" data-iconpos="top" data-role="button" data-theme="' +
                    cssDefaultJqmTheme + '" data-corners="false" data-mini="true"></div>'),
                iconName = contentItem.properties[msls_builtIn_iconProperty];

            $element.attr("data-icon", iconName || "msls-star");

            $element.appendTo(view);
            templateData.idElement = msls_getTemplateItemPath(view, $element);
        }

        msls_defineClass("ui.controls", "CommandBarButton", CommandBarButton, _Button, {
            controlName: "CommandBarButton"
        }, {
            _fillTemplate: _fillTemplate
        })
        .prototype._propertyMappings = {
            displayName: "content",
            properties: {
                icon: "icon",
                tap: "tap",
                hiddenIfDisabled: "hiddenIfDisabled"
            }
        };

    }());



    (function () {

        function ShellButton(view) {

            _Button.call(this, view);
        }

        function _fillTemplate(view, contentItem, templateData) {

            var element = $('<a class="id-element" data-role="button" data-mini="true" data-theme="' + cssDefaultJqmTheme + '"/>').appendTo(view);
            templateData.idElement = msls_getTemplateItemPath(view, element);
        }

        function _refreshView() {
            _Button.prototype._refreshView.call(this);
            if (this._isViewCreated) {
                var subControl = this._element.closest(".subControl");
                msls_addOrRemoveClass(subControl, !this.isEnabled, ui_disabled);
                msls_addOrRemoveClass(subControl, !this.isVisible, msls_collapsed);
            }
        }

        msls_defineClass("ui.controls", "ShellButton", ShellButton, _Button, {
            controlName: "ShellButton",
            _refreshView: _refreshView,

            isEnabled: msls_controlProperty(
                function onEnabledChanged(value) {
                    this._refreshView();
                }, false),
            isVisible: msls_controlProperty(
                function onVisibleChanged(value) {
                    this._refreshView();
                }, true),

            tap: msls_observableProperty()
        }, {
            _fillTemplate: _fillTemplate
        })
        .prototype._propertyMappings = {
            displayName: "content"
        };

    }());


    (function () {

        function Dropdown(view) {

            var me = this;

            msls_ui_Control.call(me, view);
            me._updatingDropdown = false;
        }

        function _refreshView() {
            if (!this._updatingDropdown && this._isViewCreated) {
                _populateOptions(this);
                _updateSelection(this);
            }
        }

        function _populateOptions(me) {

            var dropdownElement = me._dropdownElement,
                option;

            if (!me._updatingDropdown && me._isViewCreated) {
                if (me.choiceList) {
                    dropdownElement.empty();
                    $.each(me.choiceList, function () {
                        option = $("<option></option>");
                        option.attr("value", this.stringValue);
                        option.text(this.stringValue);

                        dropdownElement.append(option);
                    });
                }
            }
        }

        function _updateSelection(me) {

            var dropdownElement = me._dropdownElement,
                option,
                sValue,
                invalidValue = true;

            if (!me._updatingDropdown && me._isViewCreated) {
                sValue = me.selectedValue;
                if (sValue === null) {
                    sValue = "";
                }

                $.each(me.choiceList, function () {
                    if (this.stringValue === sValue) {
                        invalidValue = false;
                    }
                    return invalidValue;
                });

                if (invalidValue) {
                    option = $('<option disabled="disabled"></option>');
                    option.attr("value", sValue);
                    option.text(sValue);

                    dropdownElement.append(option);
                }

                try {
                    me._updatingDropdown = true;
                    me._dropdownElement.val(sValue);
                    me._dropdownElement.change();
                }
                finally {
                    me._updatingDropdown = false;
                }
            }
        }

        function _fillTemplate(view, contentItem, templateData) {
            var dropdownElement = $('<select class="id-element" data-mini="true"/>').appendTo(view);
            templateData.idElement = msls_getTemplateItemPath(view, dropdownElement);
        }

        function _attachViewCore(templateData) {
            var me = this,
                value;

            me._dropdownElement = msls_getTemplateItem(me.getView(), templateData.idElement, ".id-element");

            control_attachViewCore.call(me);

            me._dropdownElement.change(
                function (e) {
                    if (!me._updatingDropdown) {
                        value = me._dropdownElement.val();
                        if (value === "") {
                            value = null;
                        }
                        try {
                            me._updatingDropdown = true;
                            me.selectedValue = value;
                        }
                        finally {
                            me._updatingDropdown = false;
                        }
                    }
                }
            );
            me._refreshView();
        }

        function _customVisualStateHandler(e) {

            if (e.state === msls_VisualState.disabled || e.state === msls_VisualState.readOnly) {
                var element = this._dropdownElement;
                if (this._isViewCreated && !!element) {
                    if (element.data("mobile-selectmenu")) {
                        element.selectmenu(e.activate ? "disable" : "enable");
                    } else {
                        if (e.activate) {
                            this._dropdownElement.attr("disabled", "disabled");
                        } else {
                            this._dropdownElement.attr("disabled", "");
                        }
                    }
                }

                e.custom = true;
            }
        }

        var dropdown = msls_defineClass("ui.controls", "Dropdown", Dropdown, msls_ui_Control, {
            controlName: "Dropdown",
            selectedValue: msls_controlProperty(
                function onChoiceListChanged(value) {
                    _updateSelection(this);
                },
                null, true),
            choiceList: msls_controlProperty(
                function onChoiceListChanged(value) {
                    _populateOptions(this);
                }),

            _attachViewCore: _attachViewCore,
            _refreshView: _refreshView,
            _customVisualStateHandler: _customVisualStateHandler
        }, {
            _fillTemplate: _fillTemplate,
            _isFormElement: true
        });

        dropdown.prototype._propertyMappings = {
            stringValue: "selectedValue",
            choiceList: "choiceList"
        };

        dropdown.prototype._editableProperties = {
            selectedValue: "stringValue"
        };
    }());


    (function () {

        var _BaseClass = msls.ui.controls.Text,
            _layoutList = [],
            _layoutParagraphText;

        function Paragraph(view) {

            var me = this;
            _BaseClass.call(me, view);
        }

        function _fillTemplate(view, contentItem, templateData) {

            $('<div class="msls-text ' +
                (contentItem.heightSizingMode !== msls_HeightSizingMode.fitToContent ? "msls-vstretch " : "") +
                '"><p class="id-element"></p></div>').appendTo(view);
            templateData.idElement = msls_getTemplateItemPath(view, msls_control_find(view, ".id-element"));
        }

        _layoutParagraphText = function () {
            var i, len,
                task,
                tasks = [],
                newTasks;


            for (i = 0, len = _layoutList.length; i < len; i++) {
                task = _createMakeEllipsisTask(_layoutList[i]);
                if (task) {
                    tasks.push(task);
                }
            }
            while ((len = tasks.length) > 0) {
                for (i = 0; i < len; i++) {
                    tasks[i].applyChange();
                }
                newTasks = [];
                for (i = 0; i < len; i++) {
                    task = tasks[i];
                    if (task.needContinue()) {
                        newTasks.push(task);
                    }
                }
                tasks = newTasks;
            }
        };

        function _refreshView(notify) {
            var me = this,
                contentItem = me.data;

            _BaseClass.prototype._refreshView.call(me, notify);

            if (this._isViewCreated && contentItem._isUnderList && !this._needLayoutText) {
                if (contentItem.heightSizingMode !== msls_HeightSizingMode.fitToContent) {
                    this._needLayoutText = true;

                    if (_layoutList.length === 0) {
                        msls_subscribe(msls_layout_updatedNotification, _layoutParagraphText);
                    }
                    _layoutList.push(this);
                }
            }
        }

        function _onDispose() {
            if (this._needLayoutText) {
                var index = _layoutList.indexOf(this);
                if (index >= 0) {
                    if (_layoutList.length === 1) {
                        _layoutList = [];
                        msls_unsubscribe(msls_layout_updatedNotification, _layoutParagraphText);
                    } else {
                        _layoutList.splice(index, 1);
                    }
                }
            }
        }

        function _createMakeEllipsisTask(me) {
            var text = me.text,
                $textNode = me._textElement,
                textNode = $textNode[0],
                $container,
                containerHeight,
                containerWidth,
                diff,
                lastMid = 0,
                textLength,
                containerStyle,
                textStyle,
                containerPadding,
                textMargin,
                textHeight,
                start = 0, end, mid, croppedText;

            if (!text) {
                return null;
            }

            $container = $textNode.parent();
            containerHeight = $container[0].clientHeight;
            containerWidth = $container[0].clientWidth;

            if (containerHeight === 0 || containerWidth === 0) {
                return null;
            }

            if ($container.data("msls-last-height") === containerHeight &&
                $container.data("msls-last-width") === containerWidth) {

                return null;
            }

            $container.data("msls-last-height", containerHeight);
            $container.data("msls-last-width", containerWidth);

            containerStyle = window.getComputedStyle($container[0]);
            containerPadding = parseFloat(containerStyle.paddingTop) + parseFloat(containerStyle.paddingBottom);
            containerPadding = isNaN(containerPadding) ? 0 : containerPadding;
            containerHeight = Math.floor(containerHeight - containerPadding);

            textStyle = window.getComputedStyle(textNode);
            textMargin = parseFloat(textStyle.marginTop) + parseFloat(textStyle.marginBottom);
            textMargin = isNaN(textMargin) ? 0 : textMargin;
            textHeight = Math.ceil(textNode.offsetHeight + textMargin);

            textLength = text.length;
            end = textLength - 1;
            diff = containerHeight - textHeight;
            if (diff < 0) {
                return {
                    applyChange: function () {
                        if (start < end) {
                            mid = (start + end) >> 1;
                            msls_setText($textNode, text.substr(0, mid + 1) + "...");
                        } else if (mid !== lastMid) {
                            croppedText = text.substr(0, lastMid + 1);
                            msls_setText($textNode, croppedText + "...");
                        }
                    },

                    needContinue: function () {
                        if (start < end) {
                            textHeight = Math.ceil(textNode.offsetHeight + textMargin);
                            diff = containerHeight - textHeight;

                            if (diff < 0) {
                                end = mid - 1;
                            } else {
                                start = mid + 1;
                                lastMid = mid;
                            }
                            return true;
                        }
                        return false;
                    }
                };
            }

            return null;
        }

        var paragraph = msls_defineClass("ui.controls", "Paragraph", Paragraph, _BaseClass, {
            controlName: "Paragraph",
            lines: msls_observableProperty(),
            _refreshView: _refreshView,
            _onDispose: _onDispose
        }, {
            _fillTemplate: _fillTemplate,
            _skipEnhance: true
        });

        paragraph.prototype._propertyMappings = {
            stringValue: "text",
            properties: { tap: "tap" }
        };

    }());


    (function () {

        function CustomControl(view) {

            msls_ui_Control.call(this, view);
        }

        function _attachViewCore(templateData) {

            control_attachViewCore.call(this);

            var contentItem = this.data;
            if (contentItem) {
                var screenClass = contentItem.screen.constructor,
                    renderMethod = screenClass[contentItem.name + "_render"],
                    $view = this.getView();
                if (!!renderMethod && $.isFunction(renderMethod)) {
                    try {
                        renderMethod.call(null, $view[0], contentItem);
                    } catch (ex) {
                        contentItem.displayError = msls_getResourceString("customControl_renderError_2args", contentItem.name, ex);
                    }
                } else {
                    contentItem.displayError = msls_getResourceString("customControl_noRender_1args", contentItem.name);
                }
            }
        }

        function _customVisualStateHandler(e) {

            var custom = "Custom",
                contentItem = this.data,
                properties = contentItem.properties,
                isCustom = (e.state === msls_VisualState.disabled && properties.disabledRendering === custom) ||
                    (e.state === msls_VisualState.readOnly && properties.readOnlyRendering === custom) ||
                    (e.state === msls_VisualState.hasValidationError && properties.validationRendering === custom);

            if (isCustom) {
                e.custom = true;
            }
        }

        msls_defineClass("ui.controls", "CustomControl", CustomControl, msls_ui_Control, {
            controlName: "CustomControl",
            _customVisualStateHandler: _customVisualStateHandler,
            _attachViewCore: _attachViewCore
        })
        .prototype._propertyMappings = {
            stringValue: "displayName",
            properties: { tap: "tap" }
        };

    }());

}());

(function () {
    var control_attachViewCore = msls_ui_Control.prototype._attachViewCore;

    function ContentControl(view) {
        var me = this;
        me._subControls = {};
        me._resources = {};
        me.dataTemplate = "<div/>";

        msls_ui_Control.call(me, view);
    }

    function _onDataChanged(value) {
        this._refreshView();
    }

    function _attachViewCore(templateData) {
        control_attachViewCore.call(this, templateData);
        this._refreshView();
        this._dataTemplateLoaded = true;
    }

    function _refreshView() {
        var me = this,
            template,
            bindings = [];

        if (!me._isViewCreated) {
            return;
        }

        template = $(me.dataTemplate).appendTo(me.getView());
        parseTemplate(me, template, me._subControls, bindings, me._resources);
    }

    msls_defineClass("ui.controls", "ContentControl", ContentControl, msls_ui_Control, {
        controlName: "ContentControl",
        dataTemplate: msls_observableProperty(),

        _dataTemplateLoaded: msls_observableProperty(false),

        _attachViewCore: _attachViewCore,
        _refreshView: _refreshView,

        _onDataChanged: _onDataChanged
    }, {
        _fillTemplate: msls_ui_Control._fillTemplate
    });

    function parseTemplate(owner, template, subControls, bindings, resources) {

        var index,
            item,
            root,
            resourceElements,
            typeName,
            resourceName,
            _TypeConstructor,
            resource,
            subControlElements,
            controlName,
            _ControlClass,
            i,
            subControl,
            controlIdentifierName,
            binding,
            controlBindings,
            dataContextBinding;

        resourceElements = template.children(".resource");

        for (index = 0; index < resourceElements.length; index++) {
            item = resourceElements[index];
            root = $(item);

            typeName = root.attr("type");
            resourceName = root.attr("name");
            _TypeConstructor = resolvePropertyPath(typeName);

            if (!!_TypeConstructor && $.isFunction(_TypeConstructor)) {
                resource = new _TypeConstructor();

                parseAttributes(resources, item, bindings, resource, false);
            }
            resources[resourceName] = resource;
        }
        $.each(bindings, function () {
            this.bind();
        });
        resourceElements.remove();

        subControlElements = template.find(".subControl");

        function addBinding(j, b) {
            b.bind();
            bindings.push(b);
        }

        for (index = 0; index < subControlElements.length; index++) {
            item = subControlElements[index];
            root = $(item);

            controlName = root.attr("control");
            _ControlClass = msls.ui.controls[controlName];

            if (!_ControlClass) {
                _ControlClass = resolvePropertyPath(controlName);
            }

            if (!!_ControlClass && $.isFunction(_ControlClass)) {

                subControl = new _ControlClass(root);
                subControl.parent = owner;

                controlIdentifierName = root.attr("name");
                if (!controlIdentifierName) {
                    controlIdentifierName = index.toString();
                }

                controlBindings = [];
                parseAttributes(resources, item, controlBindings, subControl, false);

                dataContextBinding = msls_iterate(controlBindings).first(function (b) {
                    return b.targetProperty === "data" && b.bindingTarget === subControl;
                });
                if (!dataContextBinding) {
                    dataContextBinding = setControlProperty(resources, subControl, "data:{data, bindingMode=[msls.data.DataBindingMode.oneWayFromSource]}");
                }

                if (dataContextBinding) {
                    dataContextBinding.bindingSource = owner;
                    dataContextBinding.bind();
                    controlBindings.push(dataContextBinding);
                } else {
                }

                subControls[controlIdentifierName] = subControl;
                root.removeAttr("control");
                if (root.attr("name")) {
                    root.removeAttr("name");
                }

                $.each(controlBindings, addBinding);

                subControl.render();
            } else {
            }

        }
    }

    function parseAttributes(resources, item, bindings, target, removeAttributes) {

        var attr,
            i,
            binding,
            isHtmlAttr,
            isBuiltInAttr,
            attributesToRemove = [];

        for (i = 0; i < item.attributes.length; i++) {
            attr = item.attributes[i];

            if (attr.name.indexOf("data-ls-") === 0) {
                binding = setControlProperty(resources, target, attr.value);
                if (binding) {
                    bindings.push(binding);
                }

                if (removeAttributes) {
                    attributesToRemove.push(attr.name);
                }
            }
        }

        for (i = 0; i < attributesToRemove.length; i++) {
            item.removeAttribute(attributesToRemove[i]);
        }
    }

    function setControlProperty(resources, subControl, propertyValueRaw) {

        var i,
            items,
            propertyNameRe = /^([a-zA-Z_0-9]+):(\S+)$/,
            bindingRe = /^\{(\S*)\}$/,
            bindingPath,
            match,
            binding,
            bindingOptions = [],
            splitItems,
            propertyName,
            propertyValue,
            bindingOption;

        propertyValue = propertyValueRaw.replace(/\s/, "");

        match = propertyNameRe.exec(propertyValue);
        if (match) {
            propertyName = match[1];
            propertyValue = match[2];
        } else {
        }

        match = bindingRe.exec(propertyValue);
        if (match) {
            items = match[1].split(",");
            bindingPath = items[0];
            for (i = 1; i < items.length; i++) {
                splitItems = items[i].split("=");
                bindingOptions.push({ option: splitItems[0], value: splitItems[1] });
            }
        }

        if (!bindingPath) {
            subControl[propertyName] = loadValue(resources, propertyValue);
        } else {
            binding = new msls.data.DataBinding(bindingPath, subControl, propertyName, subControl);
            for (i = 0; i < bindingOptions.length; i++) {
                bindingOption = bindingOptions[i];
                binding[bindingOption.option] = loadValue(resources, bindingOption.value);
            }
            return binding;
        }
        return null;
    }

    var resourcePrefix = "resource:";
    function loadValue(resources, value) {

        var resourceName,
            valueRex = /^\[(\S*)\]$/,
            valueMatch = valueRex.exec(value);

        if (valueMatch) {
            value = valueMatch[1];
            if (value.indexOf(resourcePrefix) === 0) {
                resourceName = value.substr(resourcePrefix.length);
                return resources[resourceName];
            } else if (value.indexOf("#") === 0) {
                return $(value);
            } else {
                return resolvePropertyPath(value);
            }
        }

        return value;
    }


    function resolvePropertyPath(propertyPath) {

        if (!propertyPath) {
            return null;
        }

        var i,
            item,
            components = propertyPath.split("."),
            current = window;

        for (i = 0; i < components.length; i++) {

            item = components[i];

            if (i === 0 && item === "msls") {
                current = msls;
            } else {
                current = current[item];
            }

            if (!current) {
                break;
            }
        }
        return current;
    }

}());

var msls_getAttachedLabelPosition,
    msls_builtIn_widthProperty = msls_getControlPropertyId("Width"),
    msls_createPresenterTemplate,
    msls_getControlId,
    msls_layoutControlMappings = {},
    msls_controlMappings = {},
    msls_setAttachedLabelWidth;

(function () {

    var previousDataName = "msls-previous-",
        msls_builtIn_minHeightProperty = msls_getControlPropertyId("MinHeight"),
        msls_builtIn_maxHeightProperty = msls_getControlPropertyId("MaxHeight"),
        msls_builtIn_minWidthProperty = msls_getControlPropertyId("MinWidth"),
        msls_builtIn_maxWidthProperty = msls_getControlPropertyId("MaxWidth"),
        msls_builtIn_heightProperty = msls_getControlPropertyId("Height"),
        msls_builtIn_fontStyleProperty = msls_getControlPropertyId("FontStyle"),
        msls_builtIn_attachedLabelPositionProperty = msls_getControlPropertyId("AttachedLabelPosition"),
        msls_builtIn_textAlignmentProperty = msls_getControlPropertyId("TextAlignment"),
        msls_builtIn_compactMarginsProperty = msls_getControlPropertyId("CompactMargins", "RootGroup"),
        tabIndex = "tabIndex",
        disabledAttribute = "disabled",
        readOnlyAttribute = "readonly",
        ariaDisabledAttribute = "aria-disabled",
        ariaDisabledAttributeValue = "true";

    function ContentItemPresenter(view) {


        var me = this;
        me._currentVisualState = msls_VisualState.normal;
        msls_ui_Control.call(me, view);
    }

    msls_createPresenterTemplate =
    function _fillTemplate(view, contentItem, templateData) {
        var controlContainer,
            controlId,
            controlClass,
            fillTemplate;

        view.addClass("msls-presenter");
        controlContainer = _addAttachedLabel(view, contentItem, templateData);

        _addControlClasses(view, contentItem, controlContainer);

        controlId = msls_getControlId(contentItem);
        if (!!controlId) {
            controlClass = msls_controlMappings[controlId];
            if ($.isFunction(controlClass)) {
                fillTemplate = controlClass._fillTemplate;
                if (!!fillTemplate) {
                    fillTemplate(controlContainer, contentItem, templateData.control = {});
                }
            }
        }
    };

    function _attachViewCore(templateData) {
        var me = this,
            contentItem = me.data,
            idElement,
            labelElement,
            controlId;
        me._container = me.getView();


        me._contentContainer = msls_getTemplateItem(me._container, templateData.contentPath);
        me.isVisible = contentItem.isVisible;

        if (templateData.labelPath && templateData.control.idElement) {
            controlId = contentItem.screen.details._pageId + "-" + contentItem.name;
            idElement = msls_getTemplateItem(me._contentContainer, templateData.control.idElement, ".id-element");
            idElement.attr("id", controlId);
            labelElement = msls_getTemplateItem(me._container, templateData.labelPath);
            labelElement.attr("for", controlId);
        }

        _loadControl(me, templateData.control);
        msls_ui_Control.prototype._attachViewCore.call(me, templateData);

        _updateVisualState(this);
    }

    function _onDispose() {
        var contentItem = this.data;
        if (!!contentItem) {
            contentItem._view = null;
        }
    }

    function _onDataChanged(value) {
        var me = this,
            contentItem = value;

        if (me._contentItemEventHandler) {
            msls_dispose(me._contentItemEventHandler);
            me._contentItemEventHandler = null;
        }
        if (!!contentItem) {
            contentItem._view = me;

            if (contentItem.addEventListener) {
                me._contentItemEventHandler = msls_addAutoDisposeEventListener(contentItem, "change", me,
                    function onContentPropertyChanged(e) {
                        var propertyName = e.detail,
                            control,
                            mapping,
                            editableProperties,
                            targetProperty;

                        var propertiesThatAffectVisualState = ["_visualState", "_alwaysShowValidationResults", "validationResults", "displayError"];
                        if (propertiesThatAffectVisualState.indexOf(propertyName) >= 0) {
                            _updateVisualState(me);
                        }

                        control = me.underlyingControl;
                        if (!!control) {
                            mapping = control._propertyMappings;
                            if (!!mapping) {
                                editableProperties = control._editableProperties || {};
                                targetProperty = control._propertyMappings[propertyName];
                                if (!!targetProperty && typeof targetProperty === "string" && !(targetProperty in editableProperties)) {
                                    control[targetProperty] = contentItem[propertyName];
                                }
                            }
                        }
                    });
            }
        }
        _refreshView(me);
    }


    function _refreshView(me) {

        if (!me._isViewCreated) {
            return;
        }

        if (!me._container) {
            return;
        }

        if (!me.data) {
            return;
        }

        me._isViewCreated = false;
        me.getView().empty();

        me.render();
    }

    msls_getControlId =
    function getControlId(contentItem) {
        var controlModel = contentItem.controlModel;

        if (!!controlModel) {
            return msls_getProgrammaticName(controlModel.id.replace(/\S*:/, ""));
        }
        return "NoControl";
    };

    function isFormElement(contentItem) {
        var controlId = msls_getControlId(contentItem),
            controlClass;

        if (!!controlId) {
            controlClass = msls_controlMappings[controlId];
            if ($.isFunction(controlClass)) {
                return controlClass._isFormElement;
            }
        }
        return false;
    }

    function _loadControl(me, templateData) {

        var contentItem = me.data,
            controlId = msls_getControlId(contentItem),
            controlCreator,
            control;

        if (!!controlId) {
            controlCreator = msls_layoutControlMappings[controlId];
            if ($.isFunction(controlCreator)) {
                control = controlCreator(me._contentContainer, contentItem, templateData);

                if (!!control && $.isFunction(control.render)) {
                    control.parent = me;
                    me.underlyingControl = control;
                }
            } else {
            }
        }
    }

    function _addAttachedLabel(view, contentItem, templateData) {

        var bindings = [],
            labelPosition = msls_getAttachedLabelPosition(contentItem),
            isNone = labelPosition === msls_AttachedLabelPosition.none,
            isTopAligned = labelPosition === msls_AttachedLabelPosition.topAligned,
            isLeftAligned = labelPosition === msls_AttachedLabelPosition.leftAligned,
            isRightAligned = labelPosition === msls_AttachedLabelPosition.rightAligned,
            isHidden = labelPosition === msls_AttachedLabelPosition.hidden,
            contentHtml,
            contentCol,
            controlId = msls_getControlId(contentItem),
            needLabelId = !contentItem._isUnderList && !!controlId && isFormElement(contentItem),
            labelElement;

        if (isNone && !needLabelId) {
            return view;
        }


        contentHtml = "<div class='" + msls_attached_label +
                (isTopAligned ? " msls-label-align-top msls-clear msls-vauto" : "") +
                (isLeftAligned ? " msls-label-align-left" : "") +
                (isRightAligned ? " msls-label-align-right" : "") +
                (isHidden ? " msls-label-align-hidden" : "") +
                (isNone ? " msls-label-align-none" : "") +
                "' >";

        if (needLabelId) {
            if (isHidden || isNone) {
                contentHtml += '<div style="height:1px;' + (isNone ? "width:0px;" : "") + '">';
            }
            contentHtml += "<label>" + contentItem.displayName + "</label>";
            if (isHidden || isNone) {
                contentHtml += "</div>";
            }
        } else {
            if (isHidden) {
                contentHtml += '<div style="height:1px;"></div>';
            } else {
                contentHtml += "<label>" + contentItem.displayName + "</label>";
            }
        }

        contentHtml += "</div>";
        contentHtml += '<div class="' + (isTopAligned ? " msls-clear" : "") + '" />';

        view[0].innerHTML = contentHtml;
        contentCol = $(view[0].lastChild);

        templateData.contentPath = msls_getTemplateItemPath(view, contentCol);
        if (needLabelId) {
            labelElement = (isHidden || isNone) ? view[0].firstChild.firstChild.firstChild : view[0].firstChild.firstChild;
            templateData.labelPath = msls_getTemplateItemPath(view, $(labelElement));
        }

        return contentCol;
    }

    function _addControlClasses(view, contentItem, contentContainer) {

        var contentProperties = contentItem.properties,
            minHeight = contentProperties[msls_builtIn_minHeightProperty],
            maxHeight = contentProperties[msls_builtIn_maxHeightProperty],
            minWidth = contentProperties[msls_builtIn_minWidthProperty],
            maxWidth = contentProperties[msls_builtIn_maxWidthProperty],
            isFixedHeight = !contentItem._isVStretch && contentItem.heightSizingMode === msls_HeightSizingMode.fixedSize,
            isFixedWidth = !contentItem._isHStretch && contentItem.widthSizingMode === msls_WidthSizingMode.fixedSize,
            height = contentProperties[msls_builtIn_heightProperty],
            width = contentProperties[msls_builtIn_widthProperty],
            fontStyle = contentProperties[msls_builtIn_fontStyleProperty],
            hScrollEnabled = contentItem._isHStretch,
            vScrollEnabled = contentItem._isVStretch,
            containerClasses = [],
            contentContainerClasses = [];

        contentContainerClasses.push(msls_presenter_content);


        if (fontStyle) {
            contentContainerClasses.push("msls-font-style-" + fontStyle.toLowerCase());
        }

        containerClasses.push("msls-ctl-" + msls_getCssClassName(msls_getControlId(contentItem)));

        if (isFixedHeight) {
            contentContainer.height(height);
            contentContainerClasses.push("msls-fixed-height");
        } else {
            if (minHeight) {
                contentContainer.css("min-height", minHeight + "px");
            }
            if (maxHeight) {
                contentContainer.css("max-height", maxHeight + "px");
            }
        }

        if (isFixedWidth) {
            contentContainer.width(width);
            contentContainerClasses.push("msls-fixed-width");
        } else {
            if (minWidth) {
                contentContainer.css("min-width", minWidth + "px");
                view.css("min-width", minWidth + "px");
            }
            if (maxWidth) {
                contentContainer.css("max-width", maxWidth + "px");
            }
        }

        contentContainerClasses.push(contentItem._isVStretch ? "msls-vstretch" : "msls-vauto");

        containerClasses.push(contentItem._isVStretch ? "msls-vstretch" : "msls-vauto");
        containerClasses.push(contentItem._isHStretch ? "msls-hstretch" : "msls-hauto");
        if (contentItem.properties[msls_builtIn_compactMarginsProperty]) {
            containerClasses.push("msls-compact-padding");
        }
        if (!_isUsingGroupControl(contentItem)) {
            containerClasses.push("msls-leaf");
        }

        var textAlignment = contentItem.properties[msls_builtIn_textAlignmentProperty];
        if (textAlignment === "Right") {
            contentContainerClasses.push("msls-text-align-right");
        } else if (textAlignment === "Center") {
            contentContainerClasses.push("msls-text-align-center");
        }

        if (vScrollEnabled) {
            contentContainerClasses.push("msls-vscroll");
        }

        if (contentItem.kind === msls_ContentItemKind.value) {
            containerClasses.push("msls-redraw");
        }

        if (hScrollEnabled) {
            contentContainerClasses.push("msls-hscroll");
        }

        if (containerClasses.length > 0) {
            view.addClass(containerClasses.join(" "));
        }

        if (contentContainerClasses.length > 0) {
            contentContainer.addClass(contentContainerClasses.join(" "));
        }
    }

    msls_getAttachedLabelPosition =
    function getAttachedLabelPosition(contentItem) {

        var controlDefinition = contentItem.controlModel,
            labelPosition = contentItem.properties[msls_builtIn_attachedLabelPositionProperty];

        if ((!!controlDefinition && controlDefinition.attachedLabelSupport === "DisplayedByControl") || !labelPosition) {
            labelPosition = msls_AttachedLabelPosition.none;
        }

        return labelPosition;
    };

    msls_setAttachedLabelWidth =
    function updateAttachedLabels($root) {

        msls_mark(msls_codeMarkers.updateAttachedLabelsStart);

        var i,
            selector = "div.msls-label-host",
            labelHosts = $root.find(selector).filter(":visible").add($root.filter(selector)),
            node,
            parentNode,
            nextNode,
            nextParent,
            isUnderColumnsLayout,
            labels,
            maxWidth,
            labelGroupList = [],
            maxWidthList = [];

        for (i = 0; i < labelHosts.length; i++) {
            node = labelHosts[i];
            parentNode = node.parentNode;
            isUnderColumnsLayout = $(parentNode).hasClass(msls_columns_layout);
            labels = [];

            maxWidth = calculateMaxWidth(node, labels);

            if (isUnderColumnsLayout) {
                while (i < labelHosts.length - 1) {
                    nextNode = labelHosts[i + 1];
                    nextParent = nextNode.parentNode;

                    if (nextParent === parentNode) {
                        maxWidth = Math.max(maxWidth, calculateMaxWidth(nextNode, labels));
                        i++;
                    } else {
                        break;
                    }
                }
            }
            if (maxWidth > 0) {
                labelGroupList.push(labels);
                maxWidthList.push(maxWidth);
            }
        }

        $.each(labelGroupList, function (index) {
            var widthSetting = maxWidthList[index] + "px";
            $.each(this, function () {
                var style = this.style;
                if (style.width !== widthSetting) {
                    style.width = widthSetting;
                }
                if (style.minWidth !== widthSetting) {
                    style.minWidth = widthSetting;
                }
            });
        });
        msls_mark(msls_codeMarkers.updateAttachedLabelsEnd);
    };

    function calculateMaxWidth(labelHost, labels) {

        var maxWidth = 0;

        $.each(labelHost.children, function () {
            var width,
                labelContainer = $(this),
                attachedLabel = $(this.firstChild);

            if (attachedLabel.length === 1 &&
                attachedLabel.hasClass(msls_attached_label) &&
                !labelContainer.hasClass("msls-collapsed") &&
                (attachedLabel.hasClass("msls-label-align-left") ||
                 attachedLabel.hasClass("msls-label-align-right") ||
                 attachedLabel.hasClass("msls-label-align-hidden"))) {

                width = attachedLabel[0].offsetWidth + 1;
                if (width > maxWidth) {
                    maxWidth = width;
                }
                labels.push(attachedLabel[0]);
            }
        });
        return maxWidth;
    }

    function render_external(element, contentItem) {
        if (!element) {
            throw msls_getResourceString("render_invalid_arg_element");
        }
        if (!contentItem) {
            throw msls_getResourceString("render_invalid_arg_contentItem");
        }
        var presenter = new msls.ui.controls.ContentItemPresenter($(element));
        presenter.data = contentItem;
        presenter.render();
    }

    msls_expose("render", render_external);



    function _unTrim(s) {
        return " " + s + " ";
    }

    function _addOrRemoveControlOverlay(me, add) {

        var $view = me.getView(),
            $overlayParent = me._contentContainer;


        var $overlay = $overlayParent.children().filter("." + msls_state_overlay);

        if ($overlay.length > 0) {
            if (add) {
                return $overlay;
            } else {
                $overlay.remove();
                return null;
            }
        } else {
            if (add) {
                $overlay = $("<div class='msls-state-overlay'></div>").appendTo($overlayParent);
                return $overlay;
            } else {
                return null;
            }
        }
    }

    function _mapNonNestedDescendents($root, filter) {

        var results = [],
            result;

        function helper_search(element) {
            result = filter(element);
            if (result) {
                results.push(result);
            }

            for (var i = 0, children = element.childNodes, len = children.length; i < len; i++) {
                var child = children[i];

                if (!_unTrim(child.className).match(/ msls-presenter /)) {
                    helper_search(child);
                }
            }
        }

        if ($root.length) {
            helper_search($root[0]);
        }

        return results;
    }

    function _findNonNestedDescendentsByTag($root, tags) {

        return _mapNonNestedDescendents($root, function (element) {
            var tagName = element.tagName;
            return tagName && tags.indexOf(tagName.toLowerCase()) >= 0 ? element : null;
        });
    }

    function _setUndoableAttribute($elements, attributeName, value) {

        function helper(element) {
            var currentValue = $.attr(element, attributeName);
            $.data(element, previousDataName + attributeName, currentValue);
            $.attr(element, attributeName, value);
        }

        if ($elements.length === 1) {
            helper($elements[0]);
        } else {
            for (var i = 0, len = $elements.length; i < len; i++) {
                helper($elements[i]);
            }
        }
    }

    function _resetUndoableAttribute($elements, attributeName) {

        function helper(element) {
            var previousName = previousDataName + attributeName,
                previousValue = $.data(element, previousName);
            if (previousValue === undefined) {
                element.removeAttribute(attributeName);
            } else {
                element.setAttribute(attributeName, previousValue);
            }

            $.removeData(element, previousName);
        }

        if ($elements.length === 1) {
            helper($elements[0]);
        } else {
            for (var i = 0, len = $elements.length; i < len; i++) {
                helper($elements[i]);
            }
        }
    }

    function _setOrResetUndoableAttribute($element, set, attributeName, value) {

        if (set) {
            _setUndoableAttribute($element, attributeName, value);
        } else {
            _resetUndoableAttribute($element, attributeName);
        }
    }

    function _isUsingCustomControl(me) {

        function helper_isCustomControl(controlModel) {
            if (controlModel.id === ":RootCustomControl") {
                return true;
            } else {
                var baseControl = controlModel.baseControl;
                return baseControl && helper_isCustomControl(baseControl);
            }
        }

        var contentItem = me.data;
        if (!contentItem) {
            return false;
        }

        return helper_isCustomControl(contentItem.controlModel);
    }

    function _isUsingGroupControl(contentItem) {
        var controlModel = contentItem.controlModel;
        if (!controlModel) {
            return false;
        }
        return msls_isGroupControl(controlModel);
    }

    function _isUsingCollectionControl(contentItem) {
        var controlModel = contentItem.controlModel;
        if (!controlModel) {
            return false;
        }
        return controlModel.supportedContentItemKind === msls_ContentItemKind.collection;
    }

    function _disableTabIndices($root, isDisabled) {

        var supportTabIndex = _findNonNestedDescendentsByTag($root, ["a", "area", "button", "input", "object", "select", "textarea"]);
        _setOrResetUndoableAttribute($(supportTabIndex), isDisabled, tabIndex, "-1");
    }

    function _disableControlUsingOverlay(me, isDisabled) {

        var $overlay = _addOrRemoveControlOverlay(me, isDisabled);
        _disableTabIndices(me.getView(), isDisabled);
        return $overlay;
    }


    function _updateHiddenState(me, e) {


        var $root = me.getView(),
            contentItem = me.data,
            attachedLabelAlignmentScope,
            labelPosition;

        msls_addOrRemoveClass($root, e.activate, msls_collapsed);

        if (contentItem._isUnderList) {
            var $parent = $root.parent();
            if ($parent.hasClass("ui-li")) {
                msls_addOrRemoveClass($parent, e.activate, msls_collapsed);
            }
        }

        if (!e.activate) {
            labelPosition = msls_getAttachedLabelPosition(contentItem);

            if (labelPosition === msls_AttachedLabelPosition.leftAligned ||
                labelPosition === msls_AttachedLabelPosition.rightAligned ||
                labelPosition === msls_AttachedLabelPosition.hidden) {

                attachedLabelAlignmentScope = me.parent || me;
                attachedLabelAlignmentScope = attachedLabelAlignmentScope.parent || attachedLabelAlignmentScope;
                msls_setAttachedLabelWidth(attachedLabelAlignmentScope.getView());
            }
        }

        e.needsLayoutUpdate = true;
    }

    function _updateLoadingState(me, e) {

        if (e.custom) {
            return;
        }

        var contentItem = me.data;
        if (contentItem.kind === msls_ContentItemKind.command) {
            return;
        }

        var isLoading = e.activate,
            $overlay = _addOrRemoveControlOverlay(me, isLoading);
        msls_addOrRemoveClass(me._contentContainer, isLoading, msls_loading);
    }

    function _updateValidationErrorState(me, e) {

        function transformValidationResults(validationResults) {

            var results = Array.prototype.slice.call(validationResults || [], 0),
                messages = results.map(function (result) {
                    return result.message;
                });
            return messages.join("<br/>");
        }
        var contentItem = me.data;

        if (e.custom) {
            return;
        }

        if (msls_isUsingViewerControl(contentItem)) {
            return;
        }

        var showValidationErrors = contentItem._alwaysShowValidationResults && e.activate;

        msls_addOrRemoveClass(me._contentContainer, showValidationErrors, msls_validation_error);


        var $message = me._container.children("." + msls_validation_error_text);

        if (showValidationErrors) {
            var message = transformValidationResults(contentItem.validationResults);


            if (!$message.length) {
                var leftMargin = "",
                    $label = me._container.children("." + msls_attached_label);
                if (!!$label && !!$label.length) {
                    var labelPosition = msls_getAttachedLabelPosition(contentItem);
                    if (labelPosition === msls_AttachedLabelPosition.leftAligned ||
                        labelPosition === msls_AttachedLabelPosition.rightAligned ||
                        labelPosition === msls_AttachedLabelPosition.hidden) {
                        leftMargin = " style='margin-left:" + msls_getNodeWidth($label[0]).toString() + "px'";
                    }
                }
                $message = $("<div class='" + msls_validation_error_text + " " + msls_vauto + "'" + leftMargin + "></div>")
                    .appendTo(me._container);
            }
            $message.append(message);
            e.needsLayoutUpdate = true;
        } else if ($message.length) {
            $message.remove();
            e.needsLayoutUpdate = true;
        }
    }

    function _updateDisabledState(me, e) {

        var contentItem = me.data,
            $view = me.getView(),
            isDisabled = e.activate;

        if (e.custom) {
            msls_addOrRemoveClass($view, isDisabled, ui_disabled);
            return;
        }

        _setOrResetUndoableAttribute($view, isDisabled, ariaDisabledAttribute, ariaDisabledAttributeValue);

        if (_isUsingCustomControl(me)) {
            _disableControlUsingOverlay(me, isDisabled);
        } else {
            if (contentItem.kind === msls_ContentItemKind.command) {
                _setOrResetUndoableAttribute($view.find("a, button"), isDisabled, ariaDisabledAttribute, ariaDisabledAttributeValue);
            }

            var elementsToDisable = _findNonNestedDescendentsByTag($view, ["button", "fieldset", "input", "optgroup", "option", "select", "textarea"]);
            _setOrResetUndoableAttribute($(elementsToDisable), isDisabled, disabledAttribute, disabledAttribute);
        }

        msls_addOrRemoveClass($view, isDisabled, ui_disabled);
    }

    function _updateReadOnlyState(me, e) {

        var $view = me.getView(),
            contentItem = me.data,
            kind = contentItem.kind,
            isReadOnly = e.activate;

        if (e.custom) {
            return;
        }

        switch (kind) {
            case msls_ContentItemKind.group:
            case msls_ContentItemKind.details:
            case msls_ContentItemKind.value:
                break;

            default:
                return;
        }

        if (_isUsingCustomControl(me)) {
            _disableControlUsingOverlay(me, isReadOnly);
        } else {

            if (msls_isUsingViewerControl(contentItem) || _isUsingGroupControl(contentItem)) {
                return;
            }

            if (kind === msls_ContentItemKind.value || kind === msls_ContentItemKind.details) {

                var $elementsToMakeReadOnly = $(_findNonNestedDescendentsByTag($view, ["input", "textarea"])),
                    $elementsToDisable = $(_findNonNestedDescendentsByTag($view, ["select", "option"]));

                _setOrResetUndoableAttribute($elementsToMakeReadOnly, isReadOnly, readOnlyAttribute, readOnlyAttribute);
                _setOrResetUndoableAttribute($elementsToDisable, isReadOnly, disabledAttribute, disabledAttribute);

                msls_addOrRemoveClass($elementsToMakeReadOnly, isReadOnly, msls_read_only);
                msls_addOrRemoveClass($elementsToDisable, isReadOnly, msls_read_only);
            }
        }

        msls_addOrRemoveClass(me._contentContainer, isReadOnly, msls_read_only);
    }

    function _updateDisplayErrorState(me, e) {


        var showDisplayError = e.activate,
            $overlay = _disableControlUsingOverlay(me, showDisplayError);

        var $messageParent = me._contentContainer;
        msls_addOrRemoveClass($messageParent, showDisplayError, msls_display_error);

        var $message = me._contentContainer.children().filter("." + msls_display_error_text);

        if (showDisplayError) {
            var contentItem = me.data,
                message = contentItem.displayError;


            if (!$message.length) {
                $message = $("<div class='" + msls_display_error_text + "'></div>")
                    .appendTo($messageParent);
                $overlay.append("<div class='" + msls_display_error_icon + "'></div>");
            }
            $message.text(message);
            e.needsLayoutUpdate = true;
        } else if ($message.length) {
            $message.remove();
            e.needsLayoutUpdate = true;
        }
    }

    var visualStateToSetFunctionMap = {};
    visualStateToSetFunctionMap[msls_VisualState.disabled] = _updateDisabledState;
    visualStateToSetFunctionMap[msls_VisualState.hidden] = _updateHiddenState;
    visualStateToSetFunctionMap[msls_VisualState.hasValidationError] = _updateValidationErrorState;
    visualStateToSetFunctionMap[msls_VisualState.hasDisplayError] = _updateDisplayErrorState;
    visualStateToSetFunctionMap[msls_VisualState.loading] = _updateLoadingState;
    visualStateToSetFunctionMap[msls_VisualState.readOnly] = _updateReadOnlyState;

    function _updateVisualState(me) {

        function _visualStateRequiresDisplayRelative(visualState) {
            switch (visualState) {
                case msls_VisualState.loading:
                case msls_VisualState.hasDisplayError:
                case msls_VisualState.hasValidationError:
                    return true;
            }

            return _isUsingCustomControl(me) && visualState === msls_VisualState.readOnly;
        }

        var contentItem = me.data;
        if (!contentItem) {
            return;
        }

        var underlyingControl = me.underlyingControl,
            oldState = me._currentVisualState,
            newState = contentItem._visualState,
            removeOldStateFunction,
            setNewStateFunction,
            customVisualStateHandler = underlyingControl &&
                underlyingControl._customVisualStateHandler,
            needsLayoutUpdate;

        if (contentItem._isUnderList && _visualStateRequiresDisplayRelative(newState)) {
            return;
        }

        if (oldState === newState) {
            switch (newState) {
                case msls_VisualState.normal:
                case msls_VisualState.disabled:
                case msls_VisualState.hidden:
                case msls_VisualState.loading:
                case msls_VisualState.readOnly:
                    return;
            }
        }

        removeOldStateFunction = visualStateToSetFunctionMap[oldState];
        var e = { state: oldState, activate: false, custom: false, needsLayoutUpdate: false };
        if (customVisualStateHandler) {
            customVisualStateHandler.call(underlyingControl, e);
        }
        if (removeOldStateFunction) {
            removeOldStateFunction(me, e);
        }

        me._currentVisualState = newState;
        setNewStateFunction = visualStateToSetFunctionMap[newState];
        var e2 = { state: newState, activate: true, custom: false, needsLayoutUpdate: false };
        if (customVisualStateHandler) {
            customVisualStateHandler.call(underlyingControl, e2);
        }
        if (setNewStateFunction) {
            setNewStateFunction(me, e2);
        }

        needsLayoutUpdate = e.needsLayoutUpdate || e2.needsLayoutUpdate;
        if (needsLayoutUpdate && contentItem._isActivated) {
            me.getView().trigger("updatelayout");
        }
    }


    msls_defineClass("ui.controls", "ContentItemPresenter", ContentItemPresenter, msls_ui_Control, {
        controlName: "ContentItemPresenter",
        suppressLabel: false,

        _attachViewCore: _attachViewCore,

        _onDataChanged: _onDataChanged,
        _onDispose: _onDispose
    }, {
        _fillTemplate: msls_createPresenterTemplate
    });


}());

(function () {

    var _monthCalendarCache = [];

    function DateTimePicker(view) {

        var me = this;
        msls_ui_Control.call(me, view);

    }

    function _createDate(fullYear, month, day, hours, minutes, seconds, milliseconds) {

        if (fullYear >= 100 || fullYear < 0) {
            return new Date(fullYear, month, day, hours, minutes, seconds, milliseconds);
        }

        var date = new Date(0, 0, 0, 0, 0, 0, 0);
        date.setFullYear(fullYear);
        date.setMonth(month);
        date.setDate(day);
        date.setHours(hours);
        date.setMinutes(minutes);
        date.setSeconds(seconds);
        date.setMilliseconds(milliseconds);

        return date;
    }

    function _getNumberDaysInMonth(year, month) {

        return _createDate(year, month + 1, 0, 0, 0, 0, 0).getDate();
    }

    function _getFirstDayOfMonth(year, month) {

        return _createDate(year, month, 1, 0, 0, 0, 0).getDay();
    }

    function _padStringWithLeadingZeros(string, desiredLength) {

        while (desiredLength > string.length) {
            string = "0" + string;
        }

        return string;
    }

    function _getYearString(format, year) {

        return Globalize.format(_createDate(year, 0, 1, 0, 0, 0, 0), "yyyy", format.culture);
    }

    function _getMonthString(format, month) {

        return format.culture.calendars.standard.months.namesAbbr[month];
    }

    function _getPeriodString(format, period) {



        return format.culture.calendars.standard[period][0];

    }

    function _getHourString(format, hour) {

        var wrappedHour;

        switch (format.clock) {
            case "TwelveHour":
                wrappedHour = (hour % 12);
                if (wrappedHour === 0) {
                    wrappedHour = 12;
                }
                break;

            case "TwentyFourHour":
                wrappedHour = hour;
                break;

            default:
                wrappedHour = hour;
                break;
        }

        return wrappedHour.toString();

    }

    function _getMinuteString(format, minute) {

        return _padStringWithLeadingZeros(minute.toString(), 2);

    }

    function _buildOption(text, value) {

        var option = document.createElement("option");
        option.value = value;
        option.text = text;

        return option;
    }

    function _addNullOption(dropdownElement, nullOptionString) {

        var nullOption = _buildOption(nullOptionString, "");
        dropdownElement.insertBefore(nullOption, dropdownElement.firstChild);
        return nullOption;
    }

    function _selectOptionByValue(selector, value) {

        if (selector.selectedIndex >= 0 && selector[selector.selectedIndex].value === value) {
            return false;
        }

        var index = 0,
            child = selector.firstChild;

        while (child !== null) {
            if (child.tagName === "OPTION") {
                if (child.value === value) {
                    selector.selectedIndex = index;
                    return true;
                }
                index++;
            }
            child = child.nextSibling;
        }
        return false;
    }

    function _populateYearDropdownElement(me) {
        var selector = me._yearDropdownElement[0],
            date = me.date,
            format = me._format,
            selectedYear = !!me.date ? date.getFullYear() : null,
            originalDate = me.originalDate,
            originalYear = !!me.originalDate ? originalDate.getFullYear() : null,

            extraOptions = ([selectedYear, originalYear]).sort(),
            previousYearOption,
            optionIndex,
            option,
            extraOption,
            firstDefaultOption,
            currentValue;

        if (selector.selectedIndex >= 0) {
            currentValue = selector[selector.selectedIndex].value;
        }
        $(selector).find("option." + msls_extra_option).remove();
        firstDefaultOption = selector.firstChild;
        if (format._isNullable) {
            firstDefaultOption = firstDefaultOption.nextSibling;
        }

        for (optionIndex = 0; optionIndex < extraOptions.length; optionIndex++) {
            option = extraOptions[optionIndex];
            if (option !== null && option !== previousYearOption) {
                if (option < format.minimumYear) {
                    extraOption = _buildOption(_getYearString(format, option), option.toString());
                    extraOption.className = msls_extra_option;
                    selector.insertBefore(extraOption, firstDefaultOption);
                } else if (option > format.maximumYear) {
                    extraOption = _buildOption(_getYearString(format, option), option.toString());
                    extraOption.className = msls_extra_option;
                    selector.appendChild(extraOption);
                }
            }

            previousYearOption = option;
        }

        if (!me.date && !format._isNullable) {
            var nullOption = _addNullOption(selector, msls_getResourceString("dateTimePicker_emptyYear"));
            nullOption.className = msls_extra_option;
        }

        var selectedValue = selectedYear !== null ? selectedYear.toString() : "";
        if (_selectOptionByValue(selector, selectedValue) || currentValue !== selectedValue) {
            me._yearDropdownElement.change();
        }
    }

    function _populateMonthDropdownElement(me) {


        var selector = me._monthDropdownElement[0],
            format = me._format,
            currentValue;

        if (selector.selectedIndex >= 0) {
            currentValue = selector[selector.selectedIndex].value;
        }
        $(selector).find("option." + msls_extra_option).remove();

        var date = me.date,
            selectedMonth = me.date ? date.getMonth() : null;

        if (!me.date && !format._isNullable) {
            var nullOption = _addNullOption(selector, msls_getResourceString("dateTimePicker_emptyMonth"));
            nullOption.className = msls_extra_option;
        }

        var selectedValue = selectedMonth !== null ? selectedMonth.toString() : "";
        if (_selectOptionByValue(selector, selectedValue) || currentValue !== selectedValue) {
            me._monthDropdownElement.change();
        }
    }

    function _buildMonthCalendar(me, firstDayOfMonth, daysInMonth) {
        var monthCalendar,
            format = me._format,
            standard = format.culture.calendars.standard,
            days = standard.days,
            daysOfWeekAbbreviated = days.namesAbbr,
            day,
            monthCalendarTemplate = _monthCalendarCache[firstDayOfMonth];

        if (!monthCalendarTemplate) {
            _monthCalendarCache[firstDayOfMonth] = monthCalendarTemplate = document.createDocumentFragment();

            for (day = 1; day <= 31; day++) {
                var dayNumberString = _padStringWithLeadingZeros(day.toString(), 2),
                    daysOfWeekIndex = (firstDayOfMonth + day - 1) % daysOfWeekAbbreviated.length,
                    optionValue = day.toString(),
                    optionText = msls_getResourceString("dateTimePicker_dayNumberAndDayPattern", dayNumberString, daysOfWeekAbbreviated[daysOfWeekIndex]);

                monthCalendarTemplate.appendChild(_buildOption(optionText, optionValue));
            }
        }

        monthCalendar = monthCalendarTemplate.cloneNode(true);
        for (day = 31; day > daysInMonth; day--) {
            monthCalendar.removeChild(monthCalendar.lastChild);
        }
        return monthCalendar;
    }

    function _populateDayDropdownElement(me) {


        var selector = me._dayDropdownElement[0];
        $(selector).empty();

        var date = me.date || new Date(),
            format = me._format,
            month = date.getMonth(),
            year = date.getFullYear(),
            daysInMonth = _getNumberDaysInMonth(year, month),
            firstDayOfMonth = _getFirstDayOfMonth(year, month),
            monthCalendar = _buildMonthCalendar(me, firstDayOfMonth, daysInMonth),
            selectedDate = me.date ? me.date.getDate() : null;
        
        selector.appendChild(monthCalendar);

        if (!me.date || format._isNullable) {
            _addNullOption(selector, msls_getResourceString("dateTimePicker_emptyDay"));
        }

        var selectedValue = selectedDate !== null ? selectedDate.toString() : "";
        _selectOptionByValue(selector, selectedValue);
        me._dayDropdownElement.change();
    }

    function _populateHourPeriodDropdownElement(me) {
        if (!me._hourPeriodDropdownElement) {
            return;
        }


        var selector = me._hourPeriodDropdownElement[0],
            format = me._format,
            currentValue,
            firstInitialization = !selector.firstChild;

        if (selector.selectedIndex >= 0) {
            currentValue = selector[selector.selectedIndex].value;
        }
        $(selector).find("option." + msls_extra_option).remove();

        var date = me.date,
            selectedHour = me.date ? date.getHours() : null;

        if (!me.date && !format._isNullable) {
            var nullOption = _addNullOption(selector, msls_getResourceString("dateTimePicker_emptyPeriod"));
            nullOption.className = msls_extra_option;
        }

        var selectedPeriod;
        if (selectedHour === null) {
            selectedPeriod = "";
        } else if (selectedHour < 12) {
            selectedPeriod = "0";
        } else {
            selectedPeriod = "12";
        }

        if (_selectOptionByValue(selector, selectedPeriod) || currentValue !== selectedPeriod) {
            me._hourPeriodDropdownElement.change();
        }
    }

    function _populateHourNumberDropdownElement(me) {


        var selector = me._hourNumberDropdownElement[0],
            format = me._format,
            currentValue;

        if (selector.selectedIndex >= 0) {
            currentValue = selector[selector.selectedIndex].value;
        }
        $(selector).find("option." + msls_extra_option).remove();

        var date = me.date,
            selectedHour = me.date ? (date.getHours() % format.totalHourNumbers).toString() : "";


        if (!me.date && !format._isNullable) {
            var nullOption = _addNullOption(selector, msls_getResourceString("dateTimePicker_emptyHour"));
            nullOption.className = msls_extra_option;
        }

        if (_selectOptionByValue(selector, selectedHour) || currentValue !== selectedHour) {
            me._hourNumberDropdownElement.change();
        }
    }

    function _populateMinuteDropdownElement(me) {

        var selector = me._minuteDropdownElement[0],
            format = me._format,
            date = me.date,
            selectedMinute = !!date ? date.getMinutes() : null,
            originalDate = me.originalDate,
            originalMinute = !!originalDate ? originalDate.getMinutes() : null,

            extraOptions = ([selectedMinute, originalMinute]).sort().reverse(),
            optionValue,
            optionText,
            extraValue,
            extraOption,
            index,
            minute,
            previousMinute,
            existingNodes,
            currentValue,
            nullValueCount = format._isNullable ? 1 : 0;

        if (selector.selectedIndex >= 0) {
            currentValue = selector[selector.selectedIndex].value;
        }
        $(selector).find("option." + msls_extra_option).remove();

        existingNodes = selector.childNodes;

        for (var optionIndex = 0; optionIndex < extraOptions.length; optionIndex++) {
            extraValue = /*static_cast(Number)*/ extraOptions[optionIndex];
            if (extraValue !== null && extraValue !== previousMinute && (extraValue % format.minuteIncrement) > 0) {
                index = Math.floor(extraValue / format.minuteIncrement) + 1 + nullValueCount;
                extraOption = _buildOption(_getMinuteString(format, extraValue), extraValue.toString());
                extraOption.className = msls_extra_option;
                if (index < existingNodes.length) {
                    selector.insertBefore(extraOption, existingNodes[index]);
                } else {
                    selector.appendChild(extraOption);
                }
            }
            previousMinute = extraValue;
        }

        if (!me.date && !format._isNullable) {
            extraOption = _addNullOption(selector, msls_getResourceString("dateTimePicker_emptyMinute"));
            extraOption.className = msls_extra_option;
        }

        var selectedValue = selectedMinute !== null ? selectedMinute.toString() : "";
        if (_selectOptionByValue(selector, selectedValue) || selectedValue !== currentValue) {
            me._minuteDropdownElement.change();
        }
    }

    function _getCurrentDateOrDefault(me) {
        var date;
        if (me.date) {
            date = new Date(me.date);
            date.setMilliseconds(me.date.getMilliseconds());
        } else {
            date = new Date();
            if (!me.timePickerEnabled) {
                date.setHours(0, 0, 0, 0);
            } else {
                date.setSeconds(0, 0);
            }
        }
        return date;
    }

    function _updateYear(me, year) {

        if (year === null) {
            me.date = null;
            return;
        }

        var date = _getCurrentDateOrDefault(me);

        var maxDayInNewMonth = _getNumberDaysInMonth(year, date.getMonth());
        if (maxDayInNewMonth < date.getDate()) {
            date.setDate(maxDayInNewMonth);
        }

        date.setFullYear(year);
        me.date = date;
    }

    function _updateDay(me, day) {

        if (day === null) {
            me.date = null;
            return;
        }



        var date = _getCurrentDateOrDefault(me);

        var maxDayInMonth = _getNumberDaysInMonth(date.getFullYear(), date.getMonth());

        date.setDate(day);
        me.date = date;
    }

    function _updateMonth(me, month) {

        if (month === null) {
            me.date = null;
            return;
        }


        var date = _getCurrentDateOrDefault(me);

        var maxDayInNewMonth = _getNumberDaysInMonth(date.getFullYear(), month);
        if (maxDayInNewMonth < date.getDate()) {
            date.setDate(maxDayInNewMonth);
        }

        date.setMonth(month);
        me.date = date;
    }

    function _updateHour(me, hour, periodOffset) {

        if (!hour) {
            hour = 0;
        } else if (!periodOffset) {
            periodOffset = 0;
        }

        var date = _getCurrentDateOrDefault(me);
        date.setHours(hour + periodOffset);
        me.date = date;
    }

    function _updateHourPeriod(me, hour, periodOffset) {

        if (periodOffset === null) {
            me.date = null;
            return;
        }

        _updateHour(me, hour, periodOffset);
    }

    function _updateHourNumber(me, hour, periodOffset) {

        if (hour === null) {
            me.date = null;
            return;
        }

        _updateHour(me, hour, periodOffset);
    }

    function _updateMinute(me, minute) {

        if (minute === null) {
            me.date = null;
            return;
        }

        var date = _getCurrentDateOrDefault(me);
        date.setMinutes(minute, 0, 0);
        me.date = date;
    }

    function _getSelectedValue(selectItem) {

        if (!selectItem) {
            return null;
        }

        var selectElement = selectItem[0];

        var selectedValue = selectElement.options[selectElement.selectedIndex].value;

        if (selectedValue === "") {
            return null;
        } else {
            return parseInt(selectedValue, 10);
        }
    }

    function _buildDropdownElement(nameAttribute, options) {

        var selectHtml = '<select tabindex="-1" class="msls-text id-element" name="' + nameAttribute + '" data-icon="false" data-mini="true" style="min-width: 100%; max-width: none;">';
        if (!!options) {
            selectHtml += options.join("");
        }
        selectHtml += "</select>";
        return selectHtml;
    }

    function _createOption(text, value) {
        return "<option " + 'value="' + value + '">' + text + "</option>";
    }

    function _buildYearDropdownElement(format) {
        var options = [];

        if (format._isNullable) {
            options.push(_createOption(msls_getResourceString("dateTimePicker_emptyYear"), ""));
        }
        for (var year = format.minimumYear; year <= format.maximumYear; year++) {
            options.push(_createOption(_getYearString(format, year), year.toString()));
        }
        return _buildDropdownElement("year", options);
    }

    function _buildMonthDropdownElement(format) {
        var options = [];

        if (format._isNullable) {
            options.push(_createOption(msls_getResourceString("dateTimePicker_emptyMonth"), ""));
        }

        for (var month = 0; month < 12; month++) {
            options.push(_createOption(_getMonthString(format, month), month.toString()));
        }
        return _buildDropdownElement("month", options);
    }

    function _buildHourDropdownElement(format) {
        var options = [],
            totalHourNumbers = format.totalHourNumbers,
            optionValue,
            optionText;

        if (format._isNullable) {
            options.push(_createOption(msls_getResourceString("dateTimePicker_emptyHour"), ""));
        }

        for (var hour = 0; hour < totalHourNumbers; hour++) {

            optionValue = hour.toString();
            optionText = _getHourString(format, hour);

            options.push(_createOption(optionText, optionValue));
        }
        return _buildDropdownElement("hour", options);
    }

    function _buildHourPeriodDropdownElement(format) {
        var options = [],
            amPeriodString = _getPeriodString(format, "AM"),
            pmPeriodString = _getPeriodString(format, "PM");

        if (format._isNullable) {
            options.push(_createOption(msls_getResourceString("dateTimePicker_emptyPeriod"), ""));
        }
        options.push(_createOption(amPeriodString, "0"));
        options.push(_createOption(pmPeriodString, "12"));
        return _buildDropdownElement("period", options);
    }

    function _buildMinuteDropdownElement(format) {
        var options = [],
            minute,
            minuteIncrement = format.minuteIncrement,
            optionValue,
            optionText;

        if (format._isNullable) {
            options.push(_createOption(msls_getResourceString("dateTimePicker_emptyMinute"), ""));
        }
        for (minute = 0; minute < 60; minute += minuteIncrement) {
            optionValue = minute.toString();
            optionText = _getMinuteString(format, minute);
            options.push(_createOption(optionText, optionValue));
        }
        return _buildDropdownElement("minute", options);
    }

    function _buildWrappedPicker(orderedDropdownArray, dropdownContainer) {

        var dropdownHtml,
            dropdownElement;

        dropdownHtml = '<fieldset data-role="controlgroup" data-type="horizontal" data-mini="true" data-inline="true">' + orderedDropdownArray.join("") + "</fieldset>";
        dropdownElement = msls_createElement(dropdownHtml);

        dropdownContainer.appendChild(dropdownElement);
        return dropdownElement;
    }

    function _getFormat(contentItem) {

        var format = {},
            valueModel,
            propertyType,
            primitiveTypeId,
            properties = contentItem.properties;

        format.culture = Globalize.culture();
        format.minimumYear = properties.minimumYear;
        format.maximumYear = properties.maximumYear;
        format.clock = format.culture.calendars.standard.AM ? "TwelveHour" : "TwentyFourHour";
        format.minuteIncrement = properties.minuteIncrement;

        if (!format.minuteIncrement || format.minuteIncrement <= 0) {
            format.minuteIncrement = 1;
        }

        valueModel = contentItem.valueModel;
        if (!!valueModel) {
            format._isNullable = !msls_getAttribute(valueModel, ":@Required");
            propertyType = valueModel.propertyType;
            if (!!propertyType) {
                primitiveTypeId = msls_getUnderlyingTypes(propertyType).primitiveType.id;
            }

            var dateRange = msls_getAttribute(valueModel, ":@Range");
            if (!!dateRange) {

                if (!!dateRange.minimum) {

                    if (primitiveTypeId === ":DateTimeOffset") {
                        format._minimumDate = msls_parseDateTimeOffset(dateRange.minimum);
                    } else {
                        format._minimumDate = new Date(dateRange.minimum);
                    }
                    var minYear = format._minimumDate.getFullYear();

                    if (format.minimumYear < minYear) {
                        format.minimumYear = minYear;
                    }
                } else {
                    format._minimumDate = null;
                }

                if (!!dateRange.maximum) {

                    if (primitiveTypeId === ":DateTimeOffset") {
                        format._maximumDate = msls_parseDateTimeOffset(dateRange.maximum);
                    } else {
                        format._maximumDate = new Date(dateRange.maximum);
                    }
                    var maxYear = format._maximumDate.getFullYear();

                    if (format.maximumYear > maxYear) {
                        format.maximumYear = maxYear;
                    }
                } else {
                    format._maximumDate = null;
                }
            }
        }

        switch (format.clock) {
            case "TwelveHour":
                format.totalHourNumbers = 12;
                break;
            case "TwentyFourHour":
                format.totalHourNumbers = 24;
                break;

            default:
                format.totalHourNumbers = 24;
                break;
        }
        return format;
    }

    function _initializeView(me, templateData) {

        me._updatingDropdownElements = false;

        me._format = templateData.format;

        var view = me.getView(),
            dateTimePickerContainer = msls_getTemplateItem(view, templateData.containerItem);

        if (me.datePickerEnabled) {
            me._yearDropdownElement = msls_getTemplateItem(view, templateData.yearElement);

            me._monthDropdownElement = msls_getTemplateItem(view, templateData.monthElement);

            me._dayDropdownElement = msls_getTemplateItem(view, templateData.dayElement);

            me._yearDropdownElement.change(function () {
                if (!me._updatingDropdownElements) {
                    _updateYear(me, _getSelectedValue(me._yearDropdownElement));
                }
            });

            me._monthDropdownElement.change(function () {
                if (!me._updatingDropdownElements) {
                    _updateMonth(me, _getSelectedValue(me._monthDropdownElement));
                }
            });

            me._dayDropdownElement.change(function () {
                if (!me._updatingDropdownElements) {
                    _updateDay(me, _getSelectedValue(me._dayDropdownElement));
                }
            });
        }

        if (me.timePickerEnabled) {

            me._hourNumberDropdownElement = msls_getTemplateItem(view, templateData.hourNumberElement);
            me._minuteDropdownElement = msls_getTemplateItem(view, templateData.minuteElement);

            if (templateData.hourPeriodElement) {
                me._hourPeriodDropdownElement = msls_getTemplateItem(view, templateData.hourPeriodElement);
                me._hourPeriodDropdownElement.change(function () {
                    if (!me._updatingDropdownElements) {
                        _updateHourPeriod(me, _getSelectedValue(me._hourNumberDropdownElement),
                            _getSelectedValue(me._hourPeriodDropdownElement));
                    }
                });
            }

            me._hourNumberDropdownElement.change(function () {
                if (!me._updatingDropdownElements) {
                    _updateHourNumber(me, _getSelectedValue(me._hourNumberDropdownElement),
                        _getSelectedValue(me._hourPeriodDropdownElement));
                }
            });

            me._minuteDropdownElement.change(function () {
                if (!me._updatingDropdownElements) {
                    _updateMinute(me, _getSelectedValue(me._minuteDropdownElement));
                }
            });
        }

        msls_handleContainerKeyboardNavigation(view, "select");

        msls_subscribeOnce(msls_layout_updatingNotification, function () {
            $(me.getView()).find("select").each(function () {
                $(this).closest("div.ui-btn").addClass("msls-dateTimePicker-" + this.name);
            });
        });
    }


    function _updateDropdowns(me, newDate, oldDate) {

        try {

            me._updatingDropdownElements = true;

            if (me.datePickerEnabled) {
                var skipYear, skipMonth, skipDay;
                if (!!newDate && !!oldDate) {
                    skipYear = newDate.getFullYear() === oldDate.getFullYear();
                    skipMonth = newDate.getMonth() === oldDate.getMonth();
                    if (skipYear && skipMonth) {
                        skipDay = newDate.getDate() === oldDate.getDate();
                    }
                }

                if (!skipYear) {
                    _populateYearDropdownElement(me);
                }
                if (!skipMonth) {
                    _populateMonthDropdownElement(me);
                }
                if (!skipDay) {
                    _populateDayDropdownElement(me);
                }
            }

            if (me.timePickerEnabled) {
                var skipHour, skipMinute;
                if (!!newDate && !!oldDate) {
                    skipHour = newDate.getHours() === oldDate.getHours();
                    skipMinute = newDate.getMinutes() === oldDate.getMinutes();
                }
                if (!skipHour) {
                    _populateHourNumberDropdownElement(me);
                    if (me._format.clock === "TwelveHour") {
                        _populateHourPeriodDropdownElement(me);
                    }
                }
                if (!skipMinute) {
                    _populateMinuteDropdownElement(me);
                }
            }

        } finally {
            me._updatingDropdownElements = false;
        }
    }

    function _setDropdownElementIsEnabled(element, isEnabled) {
        if (!element) {
            return;
        }

        if (element.data("mobile-selectmenu")) {

            element.selectmenu(isEnabled ? "enable" : "disable");

        }

        if (isEnabled) {
            if (element.attr("disabled") === "disabled") {
                element.removeAttr("disabled");
            }
        } else {
            element.attr("disabled", "disabled");
        }
    }

    function _updateIsEnabled(me, isEnabled) {

        if (me.datePickerEnabled) {
            _setDropdownElementIsEnabled(me._yearDropdownElement, isEnabled);
            _setDropdownElementIsEnabled(me._monthDropdownElement, isEnabled);
            _setDropdownElementIsEnabled(me._dayDropdownElement, isEnabled);
        }

        if (me.timePickerEnabled) {
            _setDropdownElementIsEnabled(me._hourNumberDropdownElement, isEnabled);
            _setDropdownElementIsEnabled(me._hourPeriodDropdownElement, isEnabled);
            _setDropdownElementIsEnabled(me._minuteDropdownElement, isEnabled);

        }
    }

    function _customVisualStateHandler(e) {

        if (e.state === msls_VisualState.disabled || e.state === msls_VisualState.readOnly) {
            var isDisabledOrReadOnly = e.activate;
            _updateIsEnabled(this, !isDisabledOrReadOnly);
            e.custom = true;
        }
    }

    function _refreshView() {
        if (this._isViewCreated) {
            _updateDropdowns(this);
        }
    }

    function _attachViewCore(templateData) {
        var me = this;
        msls.ui.Control.prototype._attachViewCore.call(me);

        _initializeView(me, templateData);
        me._refreshView();
    }

    function _fillTemplate(view, contentItem, templateData) {
        var dateTimePickerContainer = msls_createElement('<div class="msls-dateTimePicker-container">'),
            properties = contentItem.properties,
            orderedDateDropdownArray = [],
            orderedTimeDropdownArray = [],
            wrapElement,
            dropDownElement,
            elementNames = [],
            i,
            hourNumberElement,
            hourPeriodElement,
            minuteElement,
            format,
            standard;

        templateData.format = format = _getFormat(contentItem);
        standard = format.culture.calendars.standard;
        view[0].appendChild(dateTimePickerContainer);

        if (properties.datePickerEnabled || templateData.isDatePicker) {

            var dateFormat = standard.patterns.d,
                delimiter = standard["/"],
                cultureDateOrderArray = dateFormat.split(delimiter, 3);

            for (var datePart = 0; datePart < cultureDateOrderArray.length; datePart++) {

                var datePartClean = cultureDateOrderArray[datePart].split(" ", 1)[0];

                switch (datePartClean) {
                    case "M":
                    case "MM":
                        orderedDateDropdownArray.push(_buildMonthDropdownElement(format));
                        elementNames.push("monthElement");
                        break;
                    case "d":
                    case "dd":
                        orderedDateDropdownArray.push(_buildDropdownElement("day"));
                        elementNames.push("dayElement");
                        break;
                    case "yyyy":
                    case "yy":
                        orderedDateDropdownArray.push(_buildYearDropdownElement(format));
                        elementNames.push("yearElement");
                        break;
                }
            }

            wrapElement = _buildWrappedPicker(orderedDateDropdownArray, dateTimePickerContainer);
            dropDownElement = wrapElement.firstChild;

            for (i = 0; i < elementNames.length; i++) {
                templateData[elementNames[i]] = msls_getTemplateItemPath(view, $(dropDownElement));
                dropDownElement = dropDownElement.nextSibling;
            }
        }

        if (properties.timePickerEnabled) {
            elementNames = [];
            hourNumberElement = _buildHourDropdownElement(format);
            minuteElement = _buildMinuteDropdownElement(format);

            orderedTimeDropdownArray.push(_buildHourDropdownElement(format));
            elementNames.push("hourNumberElement");

            orderedTimeDropdownArray.push(_buildMinuteDropdownElement(format));
            elementNames.push("minuteElement");

            if (format.clock === "TwelveHour") {
                orderedTimeDropdownArray.push(_buildHourPeriodDropdownElement(format));
                elementNames.push("hourPeriodElement");
            }

            wrapElement = _buildWrappedPicker(orderedTimeDropdownArray, dateTimePickerContainer);
            dropDownElement = wrapElement.firstChild;

            for (i = 0; i < elementNames.length; i++) {
                templateData[elementNames[i]] = msls_getTemplateItemPath(view, $(dropDownElement));
                dropDownElement = dropDownElement.nextSibling;
            }
        }
    }

    var dateTimePicker = msls_defineClass("ui.controls", "DateTimePicker", DateTimePicker, msls_ui_Control, {
        controlName: "DateTimePicker",

        datePickerEnabled: msls_controlProperty(),
        timePickerEnabled: msls_controlProperty(),
        date: msls_controlProperty(
            function onDateChanged(value) {
                if (this._isViewCreated) {
                    _updateDropdowns(this, value, this._oldDate);
                }
                this._oldDate = value;
            },
            null, true),
        originalDate: msls_controlProperty(
            function onOriginalDateChanged(value) {
                if (this._isViewCreated) {
                    _updateDropdowns(this, value, this._oldOriginalDate);
                }
                this._oldOriginalDate = value;
            }),

        _attachViewCore: _attachViewCore,
        _refreshView: _refreshView,
        _customVisualStateHandler: _customVisualStateHandler
    }, {
        _fillTemplate: _fillTemplate
    });

    dateTimePicker.prototype._propertyMappings = {
        value: "date",
        properties: {
            datePickerEnabled: "datePickerEnabled",
            timePickerEnabled: "timePickerEnabled"
        },
        details: {
            originalValue: "originalDate"
        }
    };

    dateTimePicker.prototype._editableProperties = {
        date: "value"
    };
}());


(function () {
    function DatePicker(view) {

        var me = this;
        me.timePickerEnabled = false;
        me.datePickerEnabled = true;

        msls.ui.controls.DateTimePicker.call(me, view);
    }

    msls_defineClass("ui.controls", "DatePicker", DatePicker, msls.ui.controls.DateTimePicker, {
        controlName: "DatePicker"
    }, {
        _fillTemplate:
            function _fillTemplate(view, contentItem, templateData) {
                templateData.isDatePicker = true;
                msls.ui.controls.DateTimePicker._fillTemplate(view, contentItem, templateData);
            }
    });

    msls.ui.controls.DatePicker.prototype._propertyMappings = {
        value: "date",
        details: {
            originalValue: "originalDate"
        }
    };
}());

(function () {
    var control_attachViewCore = msls.ui.Control.prototype._attachViewCore;

    function DocumentEditor(view) {

        msls.ui.Control.call(this, view);
    }

    function _fillTemplate(view, contentItem, templateData) {
        var template = "<div></div>",
            element = $(template).appendTo(view);

        templateData.idElement = msls_getTemplateItemPath(view, element);
    }

    function _attachViewCore(templateData) {
        control_attachViewCore.call(this, templateData);
        this._docElement = msls_getTemplateItem(this.getView(), templateData.idElement, "[data-role='sharepointdoceditor']");
        this._refreshView();
    }

    function _refreshView() {
    }

    msls_defineClass("ui.controls", "DocumentEditor", DocumentEditor, msls.ui.Control, {
        controlName: "DocumentEditor",

        _refreshView: _refreshView,
        _attachViewCore: _attachViewCore,

        docId: msls_controlProperty(
            function onDocIdChanged(value) {
                this._refreshView();
            }, null, true),
    }, {
        _fillTemplate: _fillTemplate,
    });

    msls.ui.controls.DocumentEditor.prototype._propertyMappings = {
        stringValue: "docId",
        properties: {
            documentLibrary: "documentLibrary",
            folderPath: "subPath"
        }
    };
}());

(function () {
    var control_attachViewCore = msls.ui.Control.prototype._attachViewCore;

    function DocumentViewer(view) {
        msls.ui.Control.call(this, view);
    }

    function _refreshView() {
        var me = this;
        if (!!this._isViewCreated && !!msls_sharepoint) {
            if (!me.docId || !me._documentLibrary || !me._folderPath) {
                me._refreshUI();
            } else {
                msls_sharepoint.ready(function () {
                    return me._refreshInternal();
                });
            }
        }
    }

    function _fillTemplate(view, contentItem, templateData) {
        view.html("<img style='display:none'></img><a class ='ui-link' href='' target='_blank'> </a><div class ='msls-error' style='display: none'></div>");
        view.addClass("msls-spdoc-link");
        templateData.imgElement = msls_getTemplateItemPath(view, view.find("img"));
        templateData.linkElement = msls_getTemplateItemPath(view, view.find("a"));
        templateData.errorElement = msls_getTemplateItemPath(view, view.find("div"));
    }

    function _refreshInternal() {
        var me = this;

        if (!me.docId || !me._documentLibrary || !me._folderPath) {
            me._refreshUI();
            return;
        }

        var docLib = msls_sharepoint.hostWeb.get_lists().getByTitle(me._documentLibrary),
            docId = parseInt(me.docId, 10),
            listItem = docLib.getItemById(docId),
            file = listItem.get_file(),
            lastModifiedBy = file.get_modifiedBy(),
            author = file.get_author();

        msls_sharepoint.load(docLib, listItem, file, lastModifiedBy, author).then(function () {
            me._docInfo = {
                name: file.get_name(),
                id: docId,
                relativeUrl: file.get_serverRelativeUrl(),
                url: msls_sharepoint.serverUrl + file.get_serverRelativeUrl() + "?Web=1",
                author: author.get_title(),
                lastModifiedBy: lastModifiedBy.get_title(),
                title: file.get_title()
            };
            me._refreshUI();
        }, function (e) {
            me._error = e;
            me._refreshUI();
        });
    }

    function _refreshUI() {
        var me = this,
            docInfo = me._docInfo;

        if (!!docInfo && !!docInfo.url && !!docInfo.name) {
            var fileName = docInfo.name,
                lastIndex = fileName.lastIndexOf("."),
                extension = lastIndex > 0 && lastIndex < (fileName.length - 1) ? fileName.substr(lastIndex + 1) : "generic";

            me._linkElement.attr("href", docInfo.url);
            me._linkElement.text(docInfo.name);
            me._imgElement.attr("src", msls_sharepoint.getIconUrl(extension));
            me._linkElement.css("display", "");
            me._imgElement.css("display", "");
            me._errorElement.css("display", "none");
        } else {
            me._linkElement.css("display", "none");
            me._imgElement.css("display", "none");
            if (me._error) {
                var error = me._error;
                me._errorElement.css("display", "");
                me._errorElement.text(error.get_message());
            }
        }
    }

    function _attachViewCore(templateData) {

        control_attachViewCore.call(this, templateData);
        this._imgElement = msls_getTemplateItem(this.getView(), templateData.imgElement, "img");
        this._linkElement = msls_getTemplateItem(this.getView(), templateData.linkElement, "a");
        this._errorElement = msls_getTemplateItem(this.getView(), templateData.errorElement, "div");

        var contentItem = this.data,
            valueModel = contentItem.valueModel,
            docStorageAttribute = valueModel && valueModel["Microsoft.LightSwitch.SharePoint:@DocumentStorage"];
        this._documentLibrary = docStorageAttribute && docStorageAttribute.documentLibrary;
        this._folderPath = docStorageAttribute && docStorageAttribute.subPath;
        this._refreshView();
    }

    msls_defineClass("ui.controls", "DocumentViewer", DocumentViewer, msls.ui.Control, {
        controlName: "DocumentViewer",

        _refreshView: _refreshView,
        _attachViewCore: _attachViewCore,
        _refreshInternal: _refreshInternal,
        _refreshUI: _refreshUI,

        docId: msls_controlProperty(
            function onDocIdChanged(value) {
                this._refreshView();
            }, null, true),
    }, {
        _fillTemplate: _fillTemplate,
    });

    msls.ui.controls.DocumentViewer.prototype._propertyMappings = {
        stringValue: "docId"
    };

}());

(function () {
    function EmailAddressEditor(view) {

        msls.ui.controls.TextBox.call(this, view);
    }

    function _fillTemplate(view, contentItem, templateData) {
        var template = '<input type="email" class="id-element" data-mini="true" />',
            textElement = $(template).appendTo(view);

        if (contentItem.maxLength) {
            msls_setTextBoxMaxLength(textElement, contentItem.maxLength);
        }

        templateData.idElement = msls_getTemplateItemPath(view, textElement);
    }

    msls_defineClass("ui.controls", "EmailAddressEditor", EmailAddressEditor, msls.ui.controls.TextBox, {
        controlName: "EmailAddressEditor"
    }, {
        _fillTemplate: _fillTemplate,
        _isFormElement: true
    });

    msls.ui.controls.EmailAddressEditor.prototype._propertyMappings = {
        stringValue: "text",
        properties: {
            placeholderText: "placeholderText"
        }
    };
}());

(function () {
    function EmailAddressViewer(view) {

        msls.ui.controls.Text.call(this, view);
    }

    function _refreshView() {
        if (this._isViewCreated) {
            this._textElement.text(this.text);
            this._textElement.attr("href", "mailto:" + this.text);
        }
    }

    function _fillTemplate(view, contentItem, templateData) {
        $('<div class="msls-text"><a class="id-element ui-link" target="_blank"></a></div>')
            .appendTo(view);
        templateData.idElement = msls_getTemplateItemPath(view, msls_control_find(view, ".id-element"));
    }

    msls_defineClass("ui.controls", "EmailAddressViewer", EmailAddressViewer, msls.ui.controls.Text, {
        controlName: "EmailAddressViewer",

        _refreshView: _refreshView
    }, {
        _fillTemplate: _fillTemplate
    });

}());

(function () {
    function FlipSwitchControl(view) {
        var me = this;
        msls_ui_Control.call(me, view);
        me._updateSelection = false;
    }

    function _fillTemplate(view, contentItem, templateData) {
        var width = 0,
            properties = contentItem.properties,
            option = properties.options,
            leftLabel = "", rightLabel = "";

        if (option === "OnOffOption") {
            leftLabel = msls_getResourceString("flipSwitchControl_offLabel");
            rightLabel = msls_getResourceString("flipSwitchControl_onLabel");
        }else {
            leftLabel = msls_getResourceString("flipSwitchControl_noLabel");
            rightLabel = msls_getResourceString("flipSwitchControl_yesLabel");
        }

        width = (leftLabel.length > rightLabel.length) ? leftLabel.length : rightLabel.length;

        var template = "<select data-role='slider' data-mini='true'><option value='false'>" + leftLabel + "</option><option value='true'>" + rightLabel + "</option></select>",
            selectElement = $(template).appendTo(view);

        templateData.idElement = msls_getTemplateItemPath(view, selectElement);
        templateData.labelWidth = width;
    }

    function _attachViewCore(templateData) {
        var me = this;

        me._selectElement = msls_getTemplateItem(me.getView(), templateData.idElement);
       
        msls.ui.Control.prototype._attachViewCore.call(me, templateData);

        me._selectElement.change(function () {
            if (!me._updateSelection) {

                try {
                    me._updateSelection = true;
                    me.sliderValue = me._selectElement.val() === "false" ? false : true;
                }
                finally {
                    me._updateSelection = false;
                }
            }
        });

        var callback = function () {
            msls_unsubscribe(msls_layout_updatingNotification, callback);
            var sibling = me._selectElement.siblings();
            if (sibling.length === 1) {
                sibling.css("min-width", templateData.labelWidth + "em");
            }
        };

        msls_subscribe(msls_layout_updatingNotification, callback);

        me._refreshView();
    }

    function _refreshView() {
        if (!this._isViewCreated) {
            return;
        }

        var sValue = this.sliderValue ? "true" : "false";

        if (!this._updateSelection || this._selectElement.val() !== sValue) {
            try {
                this._updateSelection = true;
                this._selectElement.val(sValue);
                this._selectElement.change();
            }
            finally {
                this._updateSelection = false;
            }
        }
    }

    function _customVisualStateHandler(e) {

        if (e.state === msls_VisualState.disabled || e.state === msls_VisualState.readOnly) {
            var $element = this._selectElement;
            if (this._isViewCreated && !!$element) {
                if ($element.data("mobile-slider")) {
                    $element.slider(e.activate ? "disable" : "enable");
                } else {
                    if (e.activate) {
                        $element.attr("disabled", "disabled");
                    } else {
                        $element.attr("disabled", "");
                    }
                }
            }

            e.custom = true;
        }
    }

    msls_defineClass("ui.controls", "FlipSwitchControl", FlipSwitchControl, msls_ui_Control, {
        controlName: "FlipSwitchControl",

        sliderValue: msls_controlProperty( function onSelectionChanged(value) {
            this._refreshView();
        }, false, true),

        _customVisualStateHandler: _customVisualStateHandler,
        _attachViewCore: _attachViewCore,
        _refreshView: _refreshView
    }, {
        _fillTemplate: _fillTemplate,
        _isFormElement: true
    });

    msls.ui.controls.FlipSwitchControl.prototype._propertyMappings = {
        value: "sliderValue"
    };

    msls.ui.controls.FlipSwitchControl.prototype._editableProperties = {
        sliderValue: "value"
    };
}());

(function () {
    var stretchedImageControls = [];

    function Image(view) {

        var me = this;
        msls_ui_Control.call(me, view);
    }

    function _fillTemplate(view, contentItem, templateData) {
        $('<div class="msls-image-container"><div class="msls-image-border ui-btn-down-a ui-disabled"><img alt="Image" class="msls-image-inner"/></div></div>').appendTo(view);
        var container = msls_control_find(view, ".msls-image-container"),
            border = container.children("div"),
            image = border.children("img");

        templateData.imageContainer = msls_getTemplateItemPath(view, container);
        templateData.borderElement = msls_getTemplateItemPath(view, border);
        templateData.imageElement = msls_getTemplateItemPath(view, image);
    }

    var resizeStretchedImages = function () {
        var i, len,
            imageControl,
            newSize,
            newImageSizes = [];

        for (i = 0, len = stretchedImageControls.length; i < len; i++) {
            imageControl = stretchedImageControls[i];
            if (imageControl._element.is(":visible")) {
                newImageSizes.push(_getNewImageSize(imageControl, false));
            } else {
                newImageSizes.push(null);
            }
        }
        for (i = 0; i < len; i++) {
            newSize = newImageSizes[i];
            if (newSize) {
                _setImageSize(stretchedImageControls[i], newSize);
            }
        }
    };

    function _attachViewCore(templateData) {
        var me = this,
            view = me.getView();

        me._element = msls_getTemplateItem(view, templateData.imageContainer, ".msls-image-container");
        me._border = msls_getTemplateItem(view, templateData.borderElement);
        me._image = msls_getTemplateItem(view, templateData.imageElement);

        if (me.isHStretch || me.isVStretch) {
            if (stretchedImageControls.length === 0) {
                msls_subscribe(msls_layout_updatedNotification, resizeStretchedImages);
            }
            stretchedImageControls.push(me);
        }

        _updateView(this, true);
        msls.ui.Control.prototype._attachViewCore.call(this, templateData);
    }

    function _onDispose() {
        if (this.isHStretch || this.isVStretch) {
            var index = stretchedImageControls.indexOf(this);
            if (index >= 0) {
                if (stretchedImageControls.length === 1) {
                    stretchedImageControls = [];
                    msls_unsubscribe(msls_layout_updatedNotification, resizeStretchedImages);
                } else {
                    stretchedImageControls.splice(index, 1);
                }
            }
        }
    }

    function _calculateControlSize(me, imageWidth, imageHeight) {
        var controlWidth = me.isHStretch ? me._element.width() : imageWidth,
            controlHeight = me.isVStretch ? me._element.height() : imageHeight,
            width = me.width,
            height = me.height,
            minWidth = me.minWidth,
            minHeight = me.minHeight,
            maxWidth = me.maxWidth,
            maxHeight = me.maxHeight;

        if (me.widthSizingMode === msls_WidthSizingMode.fixedSize) {
            if (typeof width === "number" && width >= 0) {
                controlWidth = width;
            }
        } else {
            if (typeof minWidth === "number" && minWidth >= 0 && controlWidth < minWidth) {
                controlWidth = minWidth;
            }
            if (typeof maxWidth === "number" && maxWidth >= 0 && controlWidth > maxWidth) {
                controlWidth = maxWidth;
            }
        }

        if (me.heightSizingMode === msls_HeightSizingMode.fitToContent && imageWidth > 0) {
            controlHeight = imageHeight * controlWidth / imageWidth;
        }

        if (me.heightSizingMode === msls_HeightSizingMode.fixedSize) {
            if (typeof height === "number" && height >= 0) {
                controlHeight = height;
            }
        } else {
            if (typeof minHeight === "number" && minHeight >= 0 && controlHeight < minHeight) {
                controlHeight = minHeight;
            }
            if (typeof maxHeight === "number" && maxHeight >= 0 && controlHeight > maxHeight) {
                controlHeight = maxHeight;
            }
        }

        if (me.widthSizingMode === msls_WidthSizingMode.fitToContent && imageHeight > 0) {
            controlWidth = imageWidth * controlHeight / imageHeight;

            if (typeof minWidth === "number" && minWidth >= 0 && controlWidth < minWidth) {
                controlWidth = minWidth;
            }
            if (typeof maxWidth === "number" && maxWidth >= 0 && controlWidth > maxWidth) {
                controlWidth = maxWidth;
            }
        }

        return { width: controlWidth, height: controlHeight };
    }

    function _getNewImageSize(me, forceUpdate) {

        var image = me._image,
            imageWidth = image.prop("naturalWidth") || 80,
            imageHeight = image.prop("naturalHeight") || 80,
            controlSize = _calculateControlSize(me, imageWidth, imageHeight),
            controlWidth = Math.floor(controlSize.width),
            controlHeight = Math.floor(controlSize.height),
            displayWidth = controlWidth,
            displayHeight = controlHeight,
            displayOffsetX = 0,
            displayOffsetY = 0,
            size = null;

        if (forceUpdate || me._controlWidth !== controlWidth || me._controlHeight !== controlHeight) {

            me._controlHeight = controlHeight;
            me._controlWidth = controlWidth;

            if (me.scale === "Fit") {
                if (controlWidth * imageHeight > imageWidth * controlHeight) {
                    displayWidth = controlHeight * imageWidth / imageHeight;
                    displayOffsetX = (controlWidth - displayWidth) / 2;
                } else {
                    displayHeight = controlWidth * imageHeight / imageWidth;
                    displayOffsetY = (controlHeight - displayHeight) / 2;
                }
            } else if (me.scale === "Fill" && imageHeight > 0 && imageWidth > 0) {
                if (controlWidth * imageHeight < imageWidth * controlHeight) {
                    displayWidth = controlHeight * imageWidth / imageHeight;
                    displayOffsetX = (controlWidth - displayWidth) / 2;
                } else {
                    displayHeight = controlWidth * imageHeight / imageWidth;
                    displayOffsetY = (controlHeight - displayHeight) / 2;
                }
            }

            if (me.widthSizingMode === msls_WidthSizingMode.fitToContent && me.heightSizingMode === msls_HeightSizingMode.fitToContent) {
                size = { border: {}, image: {} };
                if (me.minHeight > 0) {
                    size.border["min-height"] = size.image["min-height"] = me.minHeight + "px";
                }
                if (me.minWidth > 0) {
                    size.border["min-width"] = size.image["min-width"] = me.minWidth + "px";
                }
                if (me.maxHeight > 0) {
                    size.border["max-height"] = size.image["max-height"] = me.maxHeight + "px";
                }
                if (me.maxWidth > 0) {
                    size.border["max-width"] = size.image["max-width"] = me.maxWidth + "px";
                }
            } else {
                size = {
                    border: {
                        width: controlWidth.toString() + "px",
                        height: controlHeight.toString() + "px"
                    },
                    image: {
                        width: displayWidth.toString() + "px",
                        height: displayHeight.toString() + "px",
                        "margin-left": displayOffsetX.toString() + "px",
                        "margin-top": displayOffsetY.toString() + "px"
                    }
                };
            }
        }
        return size;
    }

    function _setImageSize(me, imageSize) {

        me._border.css(imageSize.border);
        me._image.css(imageSize.image);

        if (me.widthSizingMode === msls_WidthSizingMode.fitToContent ||
            me.heightSizingMode === msls_HeightSizingMode.fitToContent) {
            me.getView().trigger("updatelayout");
        }
    }

    function _updateNewImage(me, hide) {
        var size = _getNewImageSize(me, true);

        _setImageSize(me, size);

        if (!hide) {
            me._border.removeClass("ui-btn-down-a ui-disabled");
        }
    }

    function _updateView(me, inInitialization) {
        if (me._isViewCreated && !!me._element) {

            var dataUrl = me.src,
                contentItem = me.data,
                border = me._border,
                image = me._image;

            if (!!contentItem.valueModel) {
                var nullableType,
                    modelItem = contentItem.valueModel,
                    type = modelItem.propertyType;

                if (msls_isNullableType(type)) {
                    nullableType = type;
                    type = nullableType.underlyingType;
                }

                if (!!type && (type.id === ":Binary" || type.id === msls_builtIn_extensionName + ":Image")) {
                    dataUrl = "data:image;base64," + me.src;
                }
            }

            if (!inInitialization) {
                border.addClass("ui-btn-down-a ui-disabled");
            }

            image
                .off("load")
                .on("load", function () {
                    image.attr("alt", "Image");
                    _updateNewImage(me);
                })
                .off("error")
                .on("error", function () {
                    image.attr("alt", msls_getResourceString(dataUrl === me.src ? "image_invalid_url" : "image_invalid_data"));
                    _updateNewImage(me, !me.src);
                })
                .attr("src", dataUrl || null);  // If the dataUrl is undefined, the browser cannot trigger image load error event.
        }
    }

    function _onPropertyChanged(value) {
        _updateView(this, false);
    }

    msls_defineClass("ui.controls", "Image", Image, msls_ui_Control, {
        controlName: "Image",
        src: msls_controlProperty(_onPropertyChanged),
        scale: msls_controlProperty(),
        isHStretch: msls_controlProperty(),
        isVStretch: msls_controlProperty(),
        width: msls_controlProperty(),
        height: msls_controlProperty(),
        minWidth: msls_controlProperty(),
        minHeight: msls_controlProperty(),
        maxWidth: msls_controlProperty(),
        maxHeight: msls_controlProperty(),
        widthSizingMode: msls_controlProperty(),
        heightSizingMode: msls_controlProperty(),

        _attachViewCore: _attachViewCore,
        _onDispose: _onDispose
    }, {
        _fillTemplate: _fillTemplate,
        _skipEnhance: true
    });

    msls.ui.controls.Image.prototype._propertyMappings = {
        value: "src",
        properties: {
            scale: "scale",
            tap: "tap",
            width: "width",
            height: "height",
            minWidth: "minWidth",
            minHeight: "minHeight",
            maxWidth: "maxWidth",
            maxHeight: "maxHeight",
            widthSizingMode: "widthSizingMode",
            heightSizingMode: "heightSizingMode"
        },
        _isHStretch: "isHStretch",
        _isVStretch: "isVStretch"
    };
}());

(function () {

    var msls_builtIn_weightedRowHeightProperty = msls_getControlPropertyId("WeightedRowHeight", "RowsLayout"),
        msls_builtIn_weightedColumnWidthProperty = msls_getControlPropertyId("WeightedColumnWidth", "ColumnsLayout");

    function tearDownChildrenDOMTree(parentControl) {
        var view = parentControl.getView(),
            node,
            isFragment;

        node = view[0];
        while (node.parentNode) {
            node = node.parentNode;
        }
        isFragment = node !== document;


        var children = parentControl.children,
            i, len;

        for (i = 0, len = children.length; i < len; i++) {
            var childView = children[i].getView();
            if (isFragment) {
                childView.detach();
            } else {
                childView.remove();
            }
        }
    }

(function () {
    function RowsLayout(view) {

        var me = this;
        msls_ui_Control.call(me, view);
    }

    function _fillTemplate(view, contentItem, templateData) {

        var rowTexts,
            i, len,
            itemsSource,
            rowContainer;

        if (!contentItem) {
            return;
        }

        itemsSource = contentItem.children;
        if (!itemsSource || !$.isArray(itemsSource)) {
            return;
        }

        view.addClass("msls-label-host msls-rows-layout ");
        rowTexts = [];
        for (i = 0, len = itemsSource.length; i < len; i++) {
            var item = itemsSource[i],
                isFirst = i === 0,
                isLast = i === len - 1,
                weight = item.properties[msls_builtIn_weightedRowHeightProperty],
                weightText = "";

            if (!!weight && weight !== 1 && weight > 0) {
                weightText = ' data-msls-weight="' + weight + '"';
            }

            rowTexts.push('<div class="msls-clear');
            if (isFirst) {
                if (!isLast) {
                    rowTexts.push(" msls-first-row ");
                }
            } else if (isLast) {
                rowTexts.push(" msls-last-row ");
            } else {
                rowTexts.push(" msls-row ");
            }

            if (item.horizontalAlignment === msls_HorizontalAlignment.right &&
                (item.widthSizingMode === msls_WidthSizingMode.fitToContent || item.widthSizingMode === msls_WidthSizingMode.fixedSize)) {

                rowTexts.push(item._isVStretch ? " msls-vstretch" : " msls-vauto");
                rowTexts.push(' "' + weightText + '><div class="msls-halign-right ');
                rowTexts.push('"></div><div class="msls-clear"></div></div>');
            } else {
                rowTexts.push('"' + weightText + "></div>");
            }
            if (isLast) {
                rowTexts.push('<div class="msls-clear"></div>');
            }
        }

        view[0].innerHTML = rowTexts.join("");

        rowContainer = view[0].firstChild;

        $.each(itemsSource, function (index) {
            var row,
                childTemplateData = templateData[index] = {};

            if (rowContainer.firstChild) {
                row = $(rowContainer.firstChild);
                childTemplateData.containerPath = [0];
            } else {
                row = $(rowContainer);
            }

            msls_createPresenterTemplate(row, this, childTemplateData);
            rowContainer = rowContainer.nextSibling;
        });
    }

    function _attachViewCore(templateData) {
        var me = this,
            contentItem,
            rootElement,
            itemsSource,
            rowContainer;

        msls_ui_Control.prototype._attachViewCore.call(me, templateData);

        me._tapElement = me._container = me.getView();

        contentItem = me.data;
        if (!contentItem) {
            return;
        }

        itemsSource = contentItem.children;
        if (!itemsSource || !$.isArray(itemsSource)) {
            return;
        }

        rootElement = me._container[0];

        rowContainer = rootElement.firstChild;

        $.each(itemsSource, function (index) {
            var row,
                contentPresenter,
                rowTemplateData = templateData[index];

            row = msls_getTemplateItem($(rowContainer), rowTemplateData.containerPath);

            rowContainer = rowContainer.nextSibling;

            contentPresenter = new msls.ui.controls.ContentItemPresenter(row);
            contentPresenter.parent = me;
            contentPresenter.data = this;
            contentPresenter.attachView(rowTemplateData);
        });
    }

    msls_defineClass("ui.controls", "RowsLayout", RowsLayout, msls_ui_Control, {
        controlName: "RowsLayout",

        _onDispose:
            function _onDispose() {
                tearDownChildrenDOMTree(this);
            },

        _attachViewCore: _attachViewCore
    }, {
        _fillTemplate: _fillTemplate
    });

    msls.ui.controls.RowsLayout.prototype._propertyMappings = {
        properties: { tap: "tap" }
    };
}());

(function () {

    function ColumnsLayout(view) {

        var me = this;
        msls_ui_Control.call(me, view);
    }

    function _fillTemplate(view, contentItem, templateData) {

        var itemsSource,
            columnTexts,
            i, len, item, isFirst, isLast, weight, percent,
            column,
            isStretch,
            hasOnlyStretchColumns,
            totalWeight = 0,
            stretchColumnCount = 0;

        if (!contentItem) {
            return;
        }

        itemsSource = contentItem.children;

        if (!itemsSource || !$.isArray(itemsSource)) {
            return;
        }

        for (i = 0, len = itemsSource.length; i < len; i++) {
            item = itemsSource[i];
            totalWeight += item.properties[msls_builtIn_weightedColumnWidthProperty];
            stretchColumnCount += item._isHStretch ? 1 : 0;
        }
        hasOnlyStretchColumns = stretchColumnCount === len;

        view.addClass("msls-columns-layout msls-overflow-columns " +
            (stretchColumnCount === 0 || (contentItem._isUnderList && hasOnlyStretchColumns) ? "msls-static-layout" : ""));

        columnTexts = [];
        for (i = 0, len = itemsSource.length; i < len; i++) {
            item = itemsSource[i];
            isFirst = i === 0;
            isLast = i === len - 1;
            weight = item.properties[msls_builtIn_weightedColumnWidthProperty];

            columnTexts.push('<div class="');
            if (isFirst) {
                if (!isLast) {
                    columnTexts.push(" msls-first-column ");
                }
            } else if (isLast) {
                columnTexts.push(" msls-last-column ");
            } else {
                columnTexts.push(" msls-column ");
            }


            columnTexts.push('"');
            if (hasOnlyStretchColumns && contentItem._isUnderList) {
                percent = (100 * weight) / totalWeight;
                columnTexts.push('style="width:' + percent + '%;"');
            }
            if (!!weight && weight !== 1 && weight > 0) {
                columnTexts.push(' data-msls-weight="', weight + '"');
            }
            columnTexts.push('></div><div class="' + (isLast ? "msls-clear" : "msls-hempty") + '"></div>');
        }

        view[0].innerHTML = columnTexts.join("");

        i = 0;
        column = view[0].firstChild;
        while (column) {
            if (i % 2 === 0) {
                msls_createPresenterTemplate($(column), itemsSource[i / 2], templateData[i / 2] = {});
            }
            i++;
            column = column.nextSibling;
        }
    }

    function _attachViewCore(templateData) {
        var me = this,
            contentItem,
            itemsSource,
            root,
            column,
            i,
            contentItemPresenter;

        msls_ui_Control.prototype._attachViewCore.call(me, templateData);

        root = me._container = me.getView();

        contentItem = me.data;
        if (!contentItem) {
            return;
        }

        itemsSource = contentItem.children;

        if (!itemsSource || !$.isArray(itemsSource)) {
            return;
        }

        i = 0;
        column = root[0].firstChild;
        while (column) {
            if (i % 2 === 0) {
                contentItemPresenter = new msls.ui.controls.ContentItemPresenter($(column));
                contentItemPresenter.parent = me;
                contentItemPresenter.data = itemsSource[i / 2];
                contentItemPresenter.attachView(templateData[i / 2]);
            }
            i++;
            column = column.nextSibling;
        }
    }


    msls_defineClass("ui.controls", "ColumnsLayout", ColumnsLayout, msls_ui_Control, {
        controlName: "ColumnsLayout",
        _onDispose:
            function _onDispose() {
                tearDownChildrenDOMTree(this);
            },

        _attachViewCore: _attachViewCore
    }, {
        _fillTemplate: _fillTemplate
    });

    msls.ui.controls.ColumnsLayout.prototype._propertyMappings = {
        properties: { tap: "tap" }
    };
}());

(function () {

    function TableRowLayout(view) {

        var me = this;
        msls_ui_Control.call(me, view);
    }

    function _fillTemplate(view, contentItem, templateData) {

        var itemsSource,
            columnTexts,
            i, len, item, isFirst, isLast, weight, percent,
            column;

        if (!contentItem) {
            return;
        }

        itemsSource = contentItem.children;

        if (!itemsSource || !$.isArray(itemsSource)) {
            return;
        }

        view.addClass("msls-table-row");

        columnTexts = [];
        for (i = 0, len = itemsSource.length; i < len; i++) {
            columnTexts.push("<td class='msls-column' role='gridcell'");
            columnTexts.push("></td>");
        }

        view[0].innerHTML = columnTexts.join("");

        i = 0;
        column = view[0].firstChild;
        while (column) {
            msls_createPresenterTemplate($(column), itemsSource[i], templateData[i] = {});
            i++;
            column = column.nextSibling;
        }
    }

    function _attachViewCore(templateData) {
        var me = this,
            contentItem,
            itemsSource,
            root,
            column,
            i,
            contentItemPresenter;

        msls_ui_Control.prototype._attachViewCore.call(me, templateData);

        root = me._container = me.getView();

        contentItem = me.data;
        if (!contentItem) {
            return;
        }

        itemsSource = contentItem.children;

        if (!itemsSource || !$.isArray(itemsSource)) {
            return;
        }

        i = 0;
        column = root[0].firstChild;
        while (column) {
            contentItemPresenter = new msls.ui.controls.ContentItemPresenter($(column));
            contentItemPresenter.parent = me;
            contentItemPresenter.data = itemsSource[i];
            contentItemPresenter.attachView(templateData[i]);
            i++;
            column = column.nextSibling;
        }
    }


    msls_defineClass("ui.controls", "TableRowLayout", TableRowLayout, msls_ui_Control, {
        controlName: "TableRowLayout",
        _onDispose:
            function _onDispose() {
                tearDownChildrenDOMTree(this);
            },

        _attachViewCore: _attachViewCore
    }, {
        _fillTemplate: _fillTemplate
    });

    msls.ui.controls.TableRowLayout.prototype._propertyMappings = {
        properties: { tap: "tap" }
    };
}());

}());

var msls_modalView;

(function () {
    var
        shownNotification = "modalViewShown",
        closedNotification = "modalViewClosed",
        escapeElement = $("<pre/>"),
        modalViewTemplateId = "modalViewTemplate",
        popupAfterClose = "popupafterclose",
        popupAfterOpen = "popupafteropen",
        popupClose = "close",
        popupOpen = "open",
        canClosePropertyName = "__canClose",
        $activeModalView;

    function createDiv() {
        return $("<div/>");
    }

    function formatText(text) {


        escapeElement.text(text);
        text = escapeElement.html();
        return text.replace(/\n|\r\n/g, "<br>");
    }

    function showModalView(
        parentElement,
        title,
        message,
        buttons,
        defaultResult,
        buildContentCallback,
        disposeContentCallback,
        completeCallback) {


        var previousPopup = $.mobile.popup.active,
            $previousPopup = previousPopup &&
                previousPopup.element,
            $previousFocusedElement = $(document.activeElement),
            dialog,
            result = defaultResult;


        function addButtons() {
            var dialogButtons,
                theme;
            if (!buttons || !Array.isArray(buttons)) {
                return;
            }
            theme = $("body").jqmData("theme") || cssDefaultJqmTheme;
            buttons.forEach(function (buttonOption) {
                if (!!buttonOption && !!buttonOption.text) {
                    if (!dialogButtons) {
                        dialogButtons = $("<div class='msls-leaf'></div>").appendTo(dialog);
                    }

                    msls_handleKeyDownForTapAction(
                    $("<a href='#'>" + formatText(buttonOption.text) + "</a>").appendTo(dialogButtons).buttonMarkup({
                        theme: theme,
                        icon: buttonOption.icon,
                        mini: true,
                        iconpos: "left"
                    }).on("vclick", function onButtonVirtualClick(e) {
                        msls_mark(msls_codeMarkers.modalViewCloseStart);
                        result = buttonOption.result;
                        dialog.popup(popupClose);
                        e.preventDefault();
                    }));
                }
            });
        }

        function buildContent() {
            if (title) {
                $("<div></div>").addClass("msls-control-header msls-leaf")
                    .html(formatText(title)).appendTo(dialog);
            }
            if (buildContentCallback) {
                buildContentCallback(dialog);
            } else if (message) {
                createDiv().addClass("msls-leaf")
                    .html(formatText(message)).appendTo(dialog);
            }

            addButtons();

            dialog.trigger("create");
        }

        function onPopupAfterOpen() {
            msls_setProperty(dialog, canClosePropertyName, true);

            msls_handleDialogFocus(dialog.parent());

            msls_mark(msls_codeMarkers.modalViewShowEnd);
            msls_notify(shownNotification);
        }

        function completeShow() {

            $previousFocusedElement.focus();

            completeCallback(result);

            $activeModalView = null;

            msls_mark(msls_codeMarkers.modalViewCloseEnd);
            msls_notify(closedNotification);
        }

        function onPopupAfterClose() {
            msls_setProperty(dialog, canClosePropertyName, false);

            dialog
                .off(popupAfterOpen)
                .off(popupAfterClose);
            dialog.remove();
            dialog = null;

            if (disposeContentCallback) {
                disposeContentCallback();
            }

            msls_setTimeout(function () {
                if ($previousPopup) {
                    $previousPopup.one(popupAfterOpen, completeShow);

                    var popupContentItemName =
                        $previousPopup.attr("data-msls-name");
                    if (popupContentItemName) {
                        msls_shell.showPopup(popupContentItemName);
                    } else {
                        $previousPopup.popup(popupOpen);
                    }

                } else {
                    completeShow();
                }
            });
        }

        function showPopup() {
            var theme = $("body").jqmData("theme") || cssDefaultJqmTheme;
            dialog
                .removeClass(msls_collapsed)
                .popup(
                {
                    overlayTheme: theme,
                    positionTo: "window",
                    theme: theme
                })
                .on(popupAfterOpen, onPopupAfterOpen)
                .on(popupAfterClose, onPopupAfterClose)
                .popup(popupOpen);
        }



        msls_suspendLayout(true);
        try {
            $activeModalView = dialog =
                $(msls_templateStrings[modalViewTemplateId])
                    .appendTo(parentElement);

            buildContent();
        } finally {
            msls_resumeLayout(false);
            msls_updateLayout(dialog);
        }

        if ($previousPopup) {
            $previousPopup.one(popupAfterClose, function () {
                msls_setTimeout(showPopup, 1);
            });
            $previousPopup.popup(popupClose);

        } else {
            showPopup();
        }
    }

    function canCloseActiveModalView() {
        return !!$activeModalView && !!$activeModalView[canClosePropertyName];
    }

    function tryCloseActiveModalView() {
        if (canCloseActiveModalView()) {
            msls_mark(msls_codeMarkers.modalViewCloseStart);
            $activeModalView.popup(popupClose);
        }
    }

    msls_modalView = {
        show: function show(options) {
            msls_mark(msls_codeMarkers.modalViewShowStart);

            var
            promiseComplete,
            promise = new WinJS.Promise(function (complete, error) {
                promiseComplete = complete;
            }),
            parentElement = $.mobile.activePage,
            defaultResult = options.defaultResult || msls_modal_DialogResult.none;

            function _showModalView() {
                showModalView(
                    parentElement,
                    options.title,
                    options.message,
                    options.buttons,
                    defaultResult,
                    options.buildContentCallback,
                    options.disposeContentCallback,
                    promiseComplete);
            }

            if (parentElement.length !== 1) {
                promiseComplete(defaultResult);
                return promise;
            }

            if ($activeModalView) {

                msls_subscribeOnce(closedNotification, _showModalView);
                tryCloseActiveModalView();

            } else {
                _showModalView();
            }

            return promise;
        },
        close: tryCloseActiveModalView,
        isOpen: canCloseActiveModalView
    };
    msls_modal._modalView = msls_modalView;

}());

var msls_tryGetMoneyFormattedText;

(function () {
    var _BaseClass = msls.ui.controls.TextBox,
        _CurrencySymbolMode = {
            none: 0,
            symbol: 1,
            isoSymbol: 2
        },
        _InvariantCurrencySymbol = "¤",
        _CurrencySymbolsMapping = {
            AED: "\u062f.\u0625.\u200f",
            ALL: "Lek",
            AMD: "դր.",
            ARS: "$",
            AUD: "$",
            AZN: "ман.",
            BGL: "¤",
            BHD: "\u062f.\u0628.\u200f",
            BND: "$",
            BOB: "$b",
            BRL: "R$",
            BYB: "¤",
            BZD: "BZ$",
            CAD: "$",
            CHF: "Fr.",
            CLP: "$",
            CNY: "¥",
            COP: "$",
            CRC: "₡",
            CZK: "Kč",
            DKK: "kr.",
            DOP: "RD$",
            DZD: "\u062f.\u062c.\u200f",
            EEK: "kr",
            EGP: "\u062c.\u0645.\u200f",
            EUR: "€",
            GBP: "£",
            GEL: "Lari",
            GTQ: "Q",
            HKD: "HK$",
            HNL: "L.",
            HRK: "kn",
            HUF: "Ft",
            IDR: "Rp",
            ILS: "₪",
            INR: "रु",
            IQD: "\u062f.\u0639.\u200f",
            IRR: "ريال",
            ISK: "kr.",
            JMD: "J$",
            JOD: "\u062f.\u0627.\u200f",
            JPY: "¥",
            KES: "S",
            KGS: "сом",
            KRW: "₩",
            KWD: "\u062f.\u0643.\u200f",
            KZT: "Т",
            LBP: "\u0644.\u0644.\u200f",
            LTL: "Lt",
            LVL: "Ls",
            LYD: "\u062f.\u0644.\u200f",
            MAD: "\u062f.\u0645.\u200f",
            MKD: "ден.",
            MNT: "₮",
            MOP: "MOP",
            MVR: "ރ.",
            MXN: "$",
            MYR: "RM",
            NIO: "C$",
            NOK: "kr",
            NZD: "$",
            OMR: "\u0631.\u0639.\u200f",
            PAB: "B/.",
            PEN: "S/.",
            PHP: "Php",
            PKR: "Rs",
            PLN: "zł",
            PYG: "Gs",
            QAR: "\u0631.\u0642.\u200f",
            ROL: "lei",
            RSD: "Дин.",
            RUR: "р.",
            SAR: "\u0631.\u0633.\u200f",
            SEK: "kr",
            SGD: "$",
            SIT: "€",
            SKK: "€",
            SYP: "\u0644.\u0633.\u200f",
            THB: "฿",
            TND: "\u062f.\u062a.\u200f",
            TTD: "TT$",
            TWD: "NT$",
            UAH: "₴",
            USD: "$",
            UYU: "$U",
            UZS: "сўм",
            VEB: "Bs. F.",
            VND: "₫",
            YER: "\u0631.\u064a.\u200f",
            YTL: "\u0631.\u064a.\u200f",
            ZAR: "R",
            ZWD: "Z$"
        };

    function MoneyEditor(view) {
        _BaseClass.call(this, view);
        this._valueChangingText = false;
        this._symbol = null;
    }

    function _setValueFromText() {
        var text = this.text,
            numberFormat = Globalize.culture().numberFormat,
            currencyFormat = numberFormat.currency,
            originalCurrencySymbol,
            contentItem = this.data,
            validationResult,
            decimal,
            symbol,
            attribute,
            backwardsCompatibilityMode = true,
            mapping;

        if (text) {
            symbol = this._symbol;
            attribute = getMoneyPropertiesAttribute(contentItem);
            if (!!attribute && attribute.currencySymbol !== undefined) {
                backwardsCompatibilityMode = false;
                symbol =  attribute.currencySymbol || "";
            } else if (!symbol) {
                this._isoSymbol = getISOSymbol(contentItem);
                mapping = _CurrencySymbolsMapping[this._isoSymbol];
                symbol = this._symbol = mapping ? mapping : _InvariantCurrencySymbol;
            }
            originalCurrencySymbol = currencyFormat.symbol;
            currencyFormat.symbol = symbol;
            decimal = Globalize.parseFloat(text);
            if (backwardsCompatibilityMode && isNaN(decimal)) {
                currencyFormat.symbol =  this._isoSymbol;
                decimal = Globalize.parseFloat(text);
            }
            currencyFormat.symbol = originalCurrencySymbol;

            if (isNaN(decimal) ||
                text.indexOf(numberFormat.percent.symbol) !== -1) {
                validationResult = new msls_ValidationResult(contentItem.details, msls_getResourceString("validation_invalidValue_money"));
                msls_setStringValueValidationResult(contentItem, validationResult);
            } else {
                msls_clearStringValueValidationResult(contentItem);
                this.numericValue = decimal;
            }

        } else {
            this.numericValue = null;
        }
    }

    function _onTextChanged() {
        if (!this._valueChangingText) {
            this._setValueFromText();
        }
        _BaseClass.prototype._onTextChanged.call(this);
    }

    msls_tryGetMoneyFormattedText =
    function tryGetFormattedText(contentItem, value) {
        var result = "",
            decimalPlaces = 2,
            currencyFormat = Globalize.culture().numberFormat.currency,
            originalCurrencySymbol,
            mode = _CurrencySymbolMode.symbol,
            symbol = "USD",
            isFormatted = true,
            attribute,
            backwardsCompatibilityMode = true,
            mapping;

        value = msls_ensureDecimalIsNumber(value);
        if (value === null || value === undefined) {
            return "";
        }

        if (!!contentItem.details) {
            attribute = getMoneyPropertiesAttribute(contentItem);
            if (attribute) {
                decimalPlaces = attribute.decimalDigits !== undefined ? attribute.decimalDigits : decimalPlaces;
                if (attribute.currencySymbol !== undefined) {
                    backwardsCompatibilityMode = false;
                    symbol = attribute.currencySymbol || "";
                } else {
                    symbol = attribute.isoCurrencySymbol !== undefined ? attribute.isoCurrencySymbol : symbol;
                }
                mode = attribute.symbolMode !== undefined ? attribute.symbolMode : mode;
                isFormatted = attribute.isFormatted !== undefined ? attribute.isFormatted : isFormatted;
            }
            if (backwardsCompatibilityMode && isFormatted) {
                if (mode === _CurrencySymbolMode.isoSymbol) {
                    symbol = symbol.toUpperCase();
                } else if (mode === _CurrencySymbolMode.symbol) {
                    mapping = _CurrencySymbolsMapping[symbol.toUpperCase()];
                    symbol = mapping ? mapping : _InvariantCurrencySymbol;
                } else if (mode === _CurrencySymbolMode.none) {
                    symbol = "";
                }
            }
        }

        if (decimalPlaces === undefined || decimalPlaces === null) {
            decimalPlaces = msls_getDecimalPlaces(value);
        }

        if (isFormatted) {
            originalCurrencySymbol = currencyFormat.symbol;
            currencyFormat.symbol = symbol;
            result = Globalize.format(value, "c" + decimalPlaces.toString());
            currencyFormat.symbol = originalCurrencySymbol;
        } else {
            result = Globalize.format(value, "n" + decimalPlaces.toString());
        }
        return result;
    };

    function getMoneyPropertiesAttribute(contentItem) {

        var propertyDefinition = contentItem.details.getModel(),
            propertyType,
            attribute,
            attributeId = msls_builtIn_extensionName + ":@MoneyProperties";

        attribute = msls_getAttribute(propertyDefinition, attributeId);
        if (!attribute) {
            propertyType = msls_ensureNonNullableType(propertyDefinition.propertyType);
            attribute = msls_getAttribute(propertyType, attributeId);
        }

        return attribute;
    }

    function getISOSymbol(contentItem) {
        var symbol = "USD";
        if (contentItem.details) {
            var attribute = getMoneyPropertiesAttribute(contentItem);
            if (attribute) {
                symbol = attribute.isoCurrencySymbol !== undefined ? attribute.isoCurrencySymbol : symbol;
            }
        }
        return symbol.toUpperCase();
    }

    msls_defineClass("ui.controls", "MoneyEditor", MoneyEditor, _BaseClass, {
        controlName: "MoneyEditor",
        numericValue: msls_controlProperty(
            function onNumericValueChanged(value) {
                try {
                    this._valueChangingText = true;
                    this.text = msls_tryGetMoneyFormattedText(this.data, value);
                } finally {
                    this._valueChangingText = false;
                }
            }, null, true),
        _onTextChanged: _onTextChanged,
        _setValueFromText: _setValueFromText
    }, {
        _fillTemplate: _BaseClass._fillTemplate,
        _isFormElement: true
    });

    msls.ui.controls.MoneyEditor.prototype._propertyMappings = {
        value: "numericValue",
        properties: {
            placeholderText: "placeholderText"
        }
    };

    msls.ui.controls.MoneyEditor.prototype._editableProperties = {
        numericValue: "value"
    };
}());

(function () {
    function MoneyViewer(view) {

        msls.ui.controls.Text.call(this, view);
    }


    msls_defineClass("ui.controls", "MoneyViewer", MoneyViewer, msls.ui.controls.Text, {
        controlName: "MoneyViewer",
        numericValue: msls_controlProperty(
            function onNumericValueChanged(value) {
                this.text = msls_tryGetMoneyFormattedText(this.data, value);
            })
    }, {
        _fillTemplate: msls.ui.controls.Text._fillTemplate
    });

    msls.ui.controls.MoneyViewer.prototype._propertyMappings = {
        value: "numericValue",
        properties: {
            tap: "tap"
        }
    };

}());

(function () {
    function NoControl(view) {
        msls.ui.Control.call(this, view);
    }

    msls_defineClass("ui.controls", "NoControl", NoControl, msls.ui.Control, {
        controlName: "NoControl"
    });

    msls.ui.controls.NoControl.prototype._propertyMappings = {};
}());

var msls_tryGetPercentFormattedText;

(function () {
    var _BaseClass = msls.ui.controls.TextBox;

    function PercentEditor(view) {

        _BaseClass.call(this, view);
        this._valueChangingText = false;
    }

    function _setValueFromText() {
        var text = this.text,
            numberFormat = Globalize.culture().numberFormat,
            percentSymbol = numberFormat.percent.symbol,
            contentItem = this.data,
            validationResult,
            decimal,
            parts,
            fix = 2,
            value = null;

        if (text) {

            decimal = Globalize.parseFloat(text);

            if (isNaN(decimal) ||
                text.indexOf(numberFormat.currency.symbol) !== -1) {
                validationResult = new msls_ValidationResult(contentItem.details, msls_getResourceString("validation_invalidValue_percent"));
                msls_setStringValueValidationResult(contentItem, validationResult);
            } else {
                msls_clearStringValueValidationResult(contentItem);
                parts = decimal.toString().split(".");
                if (!!parts[1]) {
                    fix += parts[1].length;
                }
                this.numericValue = (decimal * 0.01).toFixed(fix);
            }
        } else {
            this.numericValue = null;
        }
    }

    function _onTextChanged() {
        if (!this._valueChangingText) {
            this._setValueFromText();
        }
        _BaseClass.prototype._onTextChanged.call(this);
    }

    msls_tryGetPercentFormattedText =
    function tryGetFormattedText(contentItem, value) {
        var decimalPlaces;

        value = msls_ensureDecimalIsNumber(value);
        if (value === null || value === undefined) {
            return "";
        }

        if (!!contentItem.details) {
            var propertyDefinition = contentItem.details.getModel(),
                propertyType,
                attribute,
                attributeId = msls_builtIn_extensionName + ":@FormatParameter";

            attribute = msls_getAttribute(propertyDefinition, attributeId);
            if (!attribute) {
                propertyType = msls_ensureNonNullableType(propertyDefinition.propertyType);
                attribute = msls_getAttribute(propertyType, attributeId);
            }

            if (attribute) {
                decimalPlaces = attribute.decimalDigits;
            }
        }

        if (decimalPlaces === undefined || decimalPlaces === null) {
            decimalPlaces = msls_getDecimalPlaces(value) - 2;
            if (decimalPlaces < 0) {
                decimalPlaces = 0;
            }
        }
        return Globalize.format(value, "p" + decimalPlaces.toString());
    };

    msls_defineClass("ui.controls", "PercentEditor", PercentEditor, _BaseClass, {
        controlName: "PercentEditor",
        numericValue: msls_controlProperty(
            function onNumericValueChanged(value) {
                try {
                    this._valueChangingText = true;
                    this.text = msls_tryGetPercentFormattedText(this.data, value);
                } finally {
                    this._valueChangingText = false;
                }
            }, null, true),
        _onTextChanged: _onTextChanged,
        _setValueFromText: _setValueFromText
    }, {
        _fillTemplate: _BaseClass._fillTemplate,
        _isFormElement: true
    });

    msls.ui.controls.PercentEditor.prototype._propertyMappings = {
        value: "numericValue",
        properties: {
            placeholderText: "placeholderText"
        }
    };

    msls.ui.controls.PercentEditor.prototype._editableProperties = {
        numericValue: "value"
    };

}());

(function () {
    function PercentViewer(view) {

        msls.ui.controls.Text.call(this, view);
    }

    msls_defineClass("ui.controls", "PercentViewer", PercentViewer, msls.ui.controls.Text, {
        controlName: "PercentViewer",
        numericValue: msls_controlProperty(
            function onNumericValueChanged(value) {
                this.text = msls_tryGetPercentFormattedText(this.data, value);
            })
    }, {
        _fillTemplate: msls.ui.controls.Text._fillTemplate
    });

    msls.ui.controls.PercentViewer.prototype._propertyMappings = {
        value: "numericValue",
        properties: {
            tap: "tap"
        }
    };

}());

(function () {
    function PhoneNumberEditor(view) {

        msls.ui.controls.TextBox.call(this, view);
    }

    function _fillTemplate(view, contentItem, templateData) {

        var template = '<input type="tel" class="id-element" data-mini="true" />',
            textElement = $(template).appendTo(view);

        if (contentItem.maxLength) {
            msls_setTextBoxMaxLength(textElement, contentItem.maxLength);
        }

        templateData.idElement = msls_getTemplateItemPath(view, textElement);
    }

    msls_defineClass("ui.controls", "PhoneNumberEditor", PhoneNumberEditor, msls.ui.controls.TextBox, {
        controlName: "PhoneNumberEditor"
    }, {
        _fillTemplate: _fillTemplate,
        _isFormElement: true
    });

    msls.ui.controls.PhoneNumberEditor.prototype._propertyMappings = {
        stringValue: "text",
        properties: {
            placeholderText: "placeholderText"
        }
    };
}());

(function () {
    function PhoneNumberViewer(view) {

        msls.ui.controls.Text.call(this, view);
    }

    function _fillTemplate(view, contentItem, templateData) {

        $('<div class="msls-text"><a class="id-element"></a></div>').appendTo(view);
        templateData.idElement = msls_getTemplateItemPath(view, msls_control_find(view, ".id-element"));
    }

    function _refreshView() {
        var me = this,
            contentItem = me.data,
            text = me.text;

        if (me._isViewCreated) {
            if (!!contentItem.details && text !== "") {
                text = me._getFormattedText(text);
            }
            this._textElement.text(text);
            this._textElement.attr("href", "tel:" + text);
        }
    }

    function _getFormattedText(text) {
        var me = this,
            contentItem = me.data,
            property = contentItem.details.getModel(),
            dataType = property.propertyType,
            nullableType,
            attribute,
            attributeName = msls_builtIn_extensionName + ":@PhoneNumberValidation";

        property = contentItem.details.getModel();
        if (msls_isNullableType(dataType)) {
            nullableType = dataType;
            dataType = nullableType.underlyingType;
        }
        if (!property[attributeName]) {
            property = dataType;
        }

        attribute = msls_getAttribute(property, attributeName);
        if (!!attribute && !!attribute.formats) {
            if (!attribute.__regexparray) {
                msls_tryGetPhoneNumberFormats(attribute);
            }
            for (var i = 0, len = attribute.__regexparray.length; i < len; i++) {
                var matches = attribute.__regexparray[i].exec(contentItem.value);
                if (matches) {
                    var output = getFormattedTextForMatch(attribute, matches, i);
                    if (output !== "") {
                        text = output;
                    }
                    break;
                }
            }
        }

        return text;
    }

    function getFormattedTextForMatch(attribute, matches, index) {
        var i,
            len,
            previous,
            countryCode = "",
            areaCode = "",
            localNumber = "",
            extension = "",
            output = "",
            countGroupC = 0,
            countGroupA = 0,
            countGroupN = 0,
            currentIndexC = 0,
            currentIndexA = 0,
            currentIndexN = 0,
            format = attribute.__formatarray[index].replace(/[^ACN]/gi, " ").replace(/\s{2,}/g, ' ').replace(/^\s*/, "").replace(/\s*$/, "");

        for (i = 0, len = format.length; i < len; i++) {
            if (previous !== format[i]) {
                if (format[i] === "C") {
                    countGroupC++;
                } else if (format[i] === "A") {
                    countGroupA++;
                } else if (format[i] === "N") {
                    countGroupN++;
                }
                previous = format[i];
            }
        }

        for (i = 0; i < countGroupC; i++) {
            countryCode += matches[1 + i];
        }
        for (i = 0; i < countGroupA; i++) {
            areaCode += matches[1 + countGroupC + i];
        }
        for (i = 0; i < countGroupN; i++) {
            localNumber += matches[1 + countGroupC + countGroupA + i];
        }
        i = countGroupC + countGroupA + countGroupN + 1;
        if (matches[i]) {
            extension += " " + matches[i] + " " + matches[i + 1];
        }

        for (i = 0, len = attribute.__formatarray.length; i < len; i++) {
            var find = true;
            for (var j = 0, len2 = attribute.__formatarray[i].length; j < len2; j++) {
                if (attribute.__formatarray[i][j] === "C") {
                    if (currentIndexC === countryCode.length) {
                        find = false;
                        break;
                    }
                    output += countryCode[currentIndexC++];
                } else if (attribute.__formatarray[i][j] === "A") {
                    if (currentIndexA === areaCode.length) {
                        find = false;
                        break;
                    }
                    output += areaCode[currentIndexA++];
                } else if (attribute.__formatarray[i][j] === "N") {
                    if (currentIndexN === localNumber.length) {
                        find = false;
                        break;
                    }
                    output += localNumber[currentIndexN++];
                } else {
                    output += attribute.__formatarray[i][j];
                }
            }
            if ((!!countryCode.length && currentIndexC !== countryCode.length) ||
                (!!areaCode.length && currentIndexA !== areaCode.length) ||
                (!!localNumber.length && currentIndexN !== localNumber.length)) {
                find = false;
            }
            if (!find) {
                currentIndexC = 0;
                currentIndexA = 0;
                currentIndexN = 0;
                output = "";
            } else {
                output += extension;
                break;
            }
        }

        return output;
    }

    msls_defineClass("ui.controls", "PhoneNumberViewer", PhoneNumberViewer, msls.ui.controls.Text, {
        controlName: "PhoneNumberViewer",
        _refreshView: _refreshView,
        _getFormattedText: _getFormattedText
    }, {
        _fillTemplate: _fillTemplate
    });

}());

(function () {

    var msls_builtIn_hideTabTitlesProperty = msls_getControlPropertyId("HideTabTitles", "Screen");

    function dispatchEventOverride(type, details, baseDispatchEvent) {

        baseDispatchEvent.call(this, type, details);
        if (type !== "change") {
            return;
        }

        switch (details) {
            case "task":
                this.refreshView();
                break;

            case "activeTab":
                _setActiveTab(this);
                break;

            case "areButtonsVisible":
                msls_updateLayout();
                break;
        }
    }

    function _fillTemplate(view, contentItem, templateData) {
        $('<ul class="msls-tabs-container" data-role="controlgroup" data-type="horizontal" />').appendTo(view);
    }

    function _attachViewCore(templateData) {
        var me = this;

        msls_ui_Control.prototype._attachViewCore.call(me, templateData);
        this.refreshView();
    }

    function refreshView() {
        var me = this,
            task = me.task,
            container,
            visibilityHelper,
            visibilityBinding,
            visibleButtonsSelector = ".subControl:not('.msls-collapsed') a";
        if (!me._isViewCreated) {
            return;
        }

        if (!task) {
            return;
        }

        container = msls_control_find(me.getView(), ".msls-tabs-container");
        container.empty();
        container.off("keydown");
        me._buttons = [];
        me._contentItems = [];

        function onVisibilityChange($button) {
            msls_updateContainerFocusItem(container, visibleButtonsSelector, $button);
        }

        var pages = task.screen.details.pages;
        $.each(task.tabCommands, function (index, tabViewModel) {
            var buttonView = $('<div class="subControl" control="Button"/>'),
                tabView = $("<li class='" + msls_screen_tab + "'></li>").append(buttonView),
                button = new msls.ui.controls.NegativeTabIndexButton(buttonView),
                tabContentItem = msls_iterate(pages).first(function (page) { return page.name === tabViewModel.name; });

            button.render();
            me._buttons.push(button);
            me._contentItems.push(tabContentItem);
            button.data = tabViewModel;
            tabView.data("msls-tabName", tabViewModel.name);

            (new msls.data.DataBinding("data.displayName", button, "content", button, msls_data_DataBindingMode.oneWayFromSource)).bind();

            (new msls.data.DataBinding("data.command", button, "tap", button, msls_data_DataBindingMode.oneWayFromSource)).bind();

            (new msls.data.DataBinding("tap.canExecute", button, "isEnabled", button)).bind();

            visibilityHelper = new msls.ui.helpers.ObservableVisibility(button.getView());
            visibilityBinding = new msls.data.DataBinding("isVisible", tabContentItem, "value", visibilityHelper,
                msls_data_DataBindingMode.oneWayFromSource);
            visibilityBinding.bind();

            visibilityHelper.onvaluechange = onVisibilityChange;

            msls_addLifetimeDependency(button, visibilityHelper);

            button.parent = me;
            container.append(tabView);
        });

        msls_handleContainerKeyboardNavigation(
            container, visibleButtonsSelector);

        visibilityHelper = new msls.ui.helpers.ObservableVisibility(me.getView());
        visibilityBinding = new msls.data.DataBinding("areButtonsVisible", me, "value", visibilityHelper,
                msls_data_DataBindingMode.oneWayFromSource);
        visibilityBinding.bind();

        msls_addLifetimeDependency(me, visibilityHelper);

        me._ul = container;
        _setActiveTab(me);
    }

    function _setActiveTab(me) {

        var navigationUnit = me.data;
        if (navigationUnit) {
            if (me._ul) {
                $("." + msls_screen_tab_active, me._ul).removeClass(msls_screen_tab_active);
            }
            for (var i = 0; i < me._buttons.length; i++) {
                var button = me._buttons[i],
                    commandVM = button.data;
                if (!!commandVM && commandVM.name === me.activeTab) {
                    var tabView = button.getView().parent();
                    tabView.addClass(msls_screen_tab_active);
                }
            }
        }
    }

    function areButtonsVisible_compute() {
        var isVisible = !this.task.screen.details.rootContentItem.properties[msls_builtIn_hideTabTitlesProperty],
            countVisibleTabs = 0;

        for (var i = 0; i < this._contentItems.length; i++) {
            var contentItem = this._contentItems[i];
            if (contentItem.isVisible) {
                countVisibleTabs++;
            }
        }

        return isVisible && countVisibleTabs > 1;
    }

    msls_defineClass("ui.controls", "ScreenTabs", function (view) {

        this._buttons = [];
        this._contentItems = [];
        msls_ui_Control.call(this, view);
    }, msls.ui.Control, {
        controlName: "ScreenTabs",
        _attachViewCore: _attachViewCore,
        refreshView: refreshView,
        dispatchEvent: msls_dispatchEventOverride(dispatchEventOverride),

        activeTab: msls_observableProperty(),
        hideTabTitles: msls_observableProperty(),
        task: msls_observableProperty(),

        areButtonsVisible: msls_computedProperty(areButtonsVisible_compute),
    }, {
        _fillTemplate: _fillTemplate
    });
}());

var msls_ui_controls_ScrollHelper;

(function () {

    function ScrollHelper(element, contentItem) {

        var me = this,
            scrollElement = element.closest(".msls-vscroll");


        msls_setProperty(me, "_onScroll", function () {
            onScroll(me);
        });

        if (scrollElement.length) {
            msls_addAutoDisposeChangeListener(
                contentItem,
                "_isActivated",
                me,
                function () {
                    if (contentItem._isActivated) {
                        msls_restoreScrollPosition(
                            scrollElement, me._savedScrollTop);
                    } else {
                        me._saveScrollTop = scrollElement.scrollTop();
                    }
                });

        } else {
            scrollElement = $(window);
        }

        msls_setProperty(me, "_scrollElement", scrollElement);

        scrollElement.on("scroll", me._onScroll);
    }

    msls_defineClass("ui.controls", "ScrollHelper", ScrollHelper, null, {
        viewHeight: msls_accessorProperty(
            function viewHeight_get() {
                return this._scrollElement.height();
            }
        ),
        viewTop: msls_accessorProperty(
            function viewTop_get() {
                return this._scrollElement.scrollTop();
            }
        ),
        scroll: msls_event(),

        _onDispose: function _onDispose() {
                var me = this;
                me._scrollElement.off("scroll", me._onScroll);
                me._onScroll = null;
                me._scrollElement = null;
            }
    });
    msls_ui_controls_ScrollHelper = msls.ui.controls.ScrollHelper;


    function onScroll(scrollHelper) {
        scrollHelper.dispatchEvent("scroll");
    }
}());

var msls_ui_CollectionControl;
(function () {
    var itemDataKey = "__entity";
    
    function ensureItemInView(control, $item) {
        var $activePage,
            headerHeight,
            footerHeight,
            $window,
            windowScrollTop,
            shouldScroll,
            focusedItemViewTop,
            focusedItemViewOffset;

        if (!control.data._isVStretch) {
            $activePage = $.mobile.activePage;
            $window = $(window);
            windowScrollTop = $window.scrollTop();
            focusedItemViewTop = $item.offset().top - windowScrollTop;

            headerHeight = $("div[data-role='header']", $activePage)
                .outerHeight();
            if (headerHeight) {
                focusedItemViewOffset = focusedItemViewTop - headerHeight;
                shouldScroll = focusedItemViewOffset < 0;
            }
            if (!shouldScroll) {
                footerHeight = $("div[data-role='footer']", $activePage)
                    .outerHeight();
                if (footerHeight) {
                    focusedItemViewOffset = $item.outerHeight() -
                        ($window.height() - focusedItemViewTop -
                        footerHeight);
                    shouldScroll = focusedItemViewOffset > 0;
                }
            }
            if (shouldScroll) {
                $window.scrollTop(windowScrollTop + focusedItemViewOffset);
            }
        }
    }


    function focusPreviousItem(control) {
        var $newFocus = control.focusableItem.prev(control._itemHtmlSelector);
        if (!$newFocus.length) {
            $newFocus = control.getItems().last();
        }
        control.focusableItem = $newFocus;
        control.focusCurrentItem();
        return false;
    }
    function focusNextItem(control) {
        var $newFocus = control.focusableItem.next(control._itemHtmlSelector);
        if (!$newFocus.length) {
            $newFocus = control.getItems().first();
        }
        control.focusableItem = $newFocus;
        control.focusCurrentItem();
        return false;
    }
    function selectFocusedItem(control) {
        control.focusableItem.trigger("vclick");
        return false;
    }
    function toggleFocusedItem(control) {
        var $focusableItem = control.focusableItem;
        var focusedItemEntity = $focusableItem.data(itemDataKey);
        var collection = control._collection;
        if (collection.selectedItem === focusedItemEntity) {
            collection.selectedItem = null;
        } else {
            selectFocusedItem(control);
        }
        return false;
    }


    function keyBindListNavigation(control) {

        var keyCodes = $.mobile.keyCode,
        listNavigation = {};
        listNavigation[keyCodes.UP] = focusPreviousItem;
        listNavigation[keyCodes.DOWN] = focusNextItem;
        listNavigation[keyCodes.ENTER] = selectFocusedItem;
        listNavigation[keyCodes.SPACE] = toggleFocusedItem;

        return new msls_ui_KeyboardDispatcher(control, listNavigation);
    }


    msls_defineClass("ui.controls", "CollectionControl",
        function CollectionControl(view) {
            msls_ui_Control.call(this, view);
            this._$focusable = $();
        }, msls_ui_Control, {
            getItems: function getItemsAbstract() {
            },
            focusableItem: msls_accessorProperty(
                function focusableItem_get() {
                    var $focusable = this._$focusable;
                    return $focusable;
                },
                function focusableItem_set($newFocus) {
                    var $oldFocus = this.focusableItem;
                    if ($oldFocus === $newFocus) {
                        return;
                    }
                    $oldFocus
                        .off("focus")
                        .attr(html_tabIndex_Attribute, "-1");
                    $newFocus
                        .on("focus", function () {
                            $(this).addClass("ui-focus")
                                .on("blur", function (e) {
                                    $(this).removeClass("ui-focus")
                                        .off("blur");
                                });
                        })
                        .attr(html_tabIndex_Attribute, "0");
                    this._$focusable = $newFocus;
                    if ($newFocus.length) {
                        ensureItemInView(this, $newFocus);
                    }
                }),
            focusCurrentItem: function focusCurrentItem() {
                    this.focusableItem.focus();
                },
        }, {
            itemDataKey: itemDataKey,

            focusPreviousItem: focusPreviousItem,
            focusNextItem: focusNextItem,
            selectFocusedItem: selectFocusedItem,
            toggleFocusedItem: toggleFocusedItem,

            keyBindListNavigation: keyBindListNavigation,
        }
    );

    msls_ui_CollectionControl = msls.ui.controls.CollectionControl;
}());

(function () {
    var
    msls_builtIn_showHeaderProperty = msls_getControlPropertyId("ShowHeader", "RootCollectionControl"),
    itemHtmlTag = "li",
    itemHtmlSelector = "li.msls-li",
    itemDataKey = "__entity",
    listViewTemplate =
        '<div class="msls-vauto ' + msls_control_header + '"/>' +
        '<div{0}><ul class="msls-listview" data-role="listview" data-inset="true" /></div>',
    listViewEmptyHtml,
    initializedNotification = "listViewInitialized",
    loadingNotification = "listViewLoading",
    itemsAddedNotification = "listViewItemsAdded",
    contentItemService = msls.services.contentItemService,
    _ContentItemPresenter = msls.ui.controls.ContentItemPresenter,
    _VisualCollectionState = msls.VisualCollection.State,
    instanceCount = 0,
    listViewChangeFocusAction = {
        nextItem: 0,
        previousItem: 1,
        nextRow: 2,
        previousRow: 3
    };

    function needReLayout(contentItem) {

        var i, child, widthSizingModeValue, stretchCount = 0,
            childCount = contentItem.children.length,
            controlModel = contentItem.controlModel;

        if (contentItem._isHStretch) {
            if (controlModel.id === ":ColumnsLayout") {
                for (i = 0; i < childCount; i++) {
                    child = contentItem.children[i];
                    widthSizingModeValue = child.properties[msls_builtIn_widthSizingModeProperty];

                    if (child._isHStretch) {
                        stretchCount++;
                    }
                }

                if (stretchCount > 0 && stretchCount < childCount) {
                    return true;
                }
            }
            for (i = 0; i < childCount; i++) {
                child = contentItem.children[i];
                if (needReLayout(child)) {
                    return true;
                }
            }
        }
        return false;
    }

    function updateTileWidth(listView) {

        var contentItem = listView.data,
            rowTemplateContentItem = contentItem.children[0],
            specifiedTileWidth = rowTemplateContentItem.properties[msls_builtIn_widthProperty],
            computedLiStyle,
            availableClientWidth,
            numberOfColumns,
            computedTileWidth,
            liMargin,
            $sampleLi = listView._ulElement.children(itemHtmlSelector);

        if (!$sampleLi.length) {
            return;
        }
        availableClientWidth = msls_getAvailableClientWidth(listView._ulElement[0]);

        if (availableClientWidth <= 0 || listView._lastWidth === availableClientWidth) {
            return;
        }

        listView._lastWidth = availableClientWidth;
        computedLiStyle = window.getComputedStyle($sampleLi[0]);
        liMargin = parseFloat(computedLiStyle.marginLeft) + parseFloat(computedLiStyle.marginRight);
        liMargin = isNaN(liMargin) ? 0 : liMargin;

        specifiedTileWidth += liMargin;

        numberOfColumns = Math.max(Math.floor(availableClientWidth / (specifiedTileWidth + liMargin)), 1),
        computedTileWidth = Math.floor(availableClientWidth / numberOfColumns) - Math.ceil(liMargin);

        if (!listView._globalStyle) {
            listView._globalStyle = $('<style id="msls-global-list-style-' + listView._uniqueName + '"></style>')
                                     .appendTo($("head"));
        }
        listView._globalStyle.text("ul.msls-tile-list[data-msls-list-name='" + listView._uniqueName +
                    "'] li { width: " + computedTileWidth + "px; }");
    }

    function updateSelection(listView, liElement) {


        var
        collection = listView._collection,
        entity;

        listView._selectingElement = liElement;

        entity = liElement.data(itemDataKey);
        collection.selectedItem = entity;

        listView._selectingElement = null;

        msls_mark(msls_codeMarkers.listSelectedItemChanged);
    }

    function addItemEventHandlers(listView) {

        var ulElement = listView._ulElement,
            ulHtmlElement = ulElement[0];

        msls_bind_clickEvent(ulElement,
           listView,
           "itemTap",
           "ItemTapPromise",
           function filterEvent(e) {
               return $(e.target).closest(itemHtmlSelector).length;
           }
        );
    }

    function endLoading(listView) {
        updateListViewEmpty(listView);
        notifyLoading(listView, false);
    }

    function loadMoreEntities(listView) {
        var collection = listView._collection,
            itemsCount = listView.data.children.length - 1,
            collectionData = collection.data;

        if (itemsCount < collectionData.length) {

            notifyLoading(listView, true);
            addListItems(listView, collectionData.slice(
                itemsCount, itemsCount + collection._loader._pageSize));

        } else if (collection.canLoadMore) {
            msls_mark(msls_codeMarkers.listViewLoadLoadMore);
            collection.loadMore(true);

        } else {
            endLoading(listView);
        }
    }

    function tryLoadMoreEntities(listView) {
        var collection = listView._collection;

        if (!collection) {
            return;
        }

        if (collection.state === _VisualCollectionState.idle) {
            var scrollHelper = listView._scrollHelper,
                needMoreItems =
                    listView.data._isActivated &&
                    listView._ulElement.height() - scrollHelper.viewTop <
                        2 * scrollHelper.viewHeight;

            if (needMoreItems) {
                loadMoreEntities(listView);
            } else {
                endLoading(listView);
            }
        }
    }

    function updateListViewEmpty(listView) {

        var ulElement = listView._ulElement,
            emptyElement = ulElement.next("." + msls_list_empty);

        if (listView.data.children.length === 1) {
            if (!listViewEmptyHtml) {
                listViewEmptyHtml = "<div class='" + msls_list_empty + "'>" +
                    msls_getResourceString("listView_no_items") + "</div>";
            }
            if (!emptyElement.length) {
                ulElement.after(listViewEmptyHtml);
            }
        } else {
            emptyElement.remove();
        }
    }

    function needEnhancement(contentItem) {
        var controlId,
            controlClass;

        if (msls_isGroupControl(contentItem.controlModel)) {
            return msls_iterate(contentItem.children).any(needEnhancement);
        }

        controlId = msls_getControlId(contentItem);
        if (controlId) {
            controlClass = msls_controlMappings[controlId];
            if ($.isFunction(controlClass)) {
                return !controlClass._skipEnhance;
            }
        }
        return true;
    }

    function addListItems(listView, items, startingIndex, skipTryLoadMore) {

        var
        index, lastIndex = items.length - 1,
        ulElement = listView._ulElement,
        listViewContentItem = listView.data,
        rowTemplateContentItem = listViewContentItem.children[0],
        prependElements = startingIndex === 0 && ulElement.find(itemHtmlSelector).length !== 0,
        contentItemPresenterView,
        rowElement,
        theme,
        rowTemplate = listView._rowTemplate,
        rowTemplateData = listView._rowTemplateData,
        li,
        contentItemPresenterControl,
        emptyElement = $(".msls-empty", ulElement),
        addedElements = [],
        addedContentItems = [],
        addedElementsContainer,
        listNode = ulElement[0],
        insertPosition,
        $elements,
        $focusableItem;


        if (!rowTemplateContentItem) {
            return;
        }

        if (lastIndex >= 0) {

            if (!rowTemplate) {
                rowTemplateData = listView._rowTemplateData = {};
                rowTemplate = listView._rowTemplate = window.document.createElement(itemHtmlTag);
                li = $(rowTemplate);

                contentItemPresenterView = $("<div></div>").appendTo(li);
                $('<div class="msls-clear"></div>').appendTo(li);
                li.attr(html_tabIndex_Attribute, "-1");
                li.attr("data-icon", "false");

                theme = $.mobile.getInheritedTheme(ulElement, cssDefaultJqmTheme);
                li.addClass("msls-li msls-style ui-shadow ui-li ui-btn ui-btn-up-" + theme);
                li.attr("data-theme", theme);

                msls_createPresenterTemplate(contentItemPresenterView, rowTemplateContentItem, rowTemplateData);
                listView._itemHasAttachedLabel = !!li.find("." + msls_attached_label).length;

                listView._shouldEnhance = needEnhancement(rowTemplateContentItem);
            }


            addedElementsContainer = document.createDocumentFragment();
            for (index = 0; index <= lastIndex; index++) {
                addedContentItems.push(contentItemService.cloneContentItemTree(rowTemplateContentItem, listViewContentItem, items[index]));

                rowElement = rowTemplate.cloneNode(true);
                addedElements.push(rowElement);
                addedElementsContainer.appendChild(rowElement);
            }

            insertPosition = (prependElements ? listNode.firstChild : (emptyElement.length > 0 ? emptyElement[0] : null));
            if (!!insertPosition) {
                listNode.insertBefore(addedElementsContainer, insertPosition);
            } else {
                listNode.appendChild(addedElementsContainer);
            }

            for (index = 0; index <= lastIndex; index++) {
                li = $(rowElement = addedElements[index]);
                li.data(itemDataKey, items[index]);

                contentItemPresenterView = $(rowElement.firstChild);

                contentItemPresenterControl = new _ContentItemPresenter(contentItemPresenterView);
                contentItemPresenterControl.parent = listView;
                contentItemPresenterControl.data = addedContentItems[index];
                contentItemPresenterControl.attachView(rowTemplateData);
            }

            $elements = $(addedElements);
            msls_mark(msls_codeMarkers.listViewLoadEnhanceView);
            if (listView._shouldEnhance) {
                $elements.trigger("create");
            }
            ulElement.listview("refresh");
            if (!listView._focusableItem && !!addedElements.length) {
                $focusableItem = listView._focusableItem =
                    $(addedElements[0]);
                $focusableItem.attr(html_tabIndex_Attribute, "0");
            }

            msls_notify(itemsAddedNotification, listView);
        }

        msls_mark(msls_codeMarkers.listViewLoadApplyEnd);

        function onLayoutUpdated() {
            msls_unsubscribe(msls_layout_updatedNotification, onLayoutUpdated);
            msls_dispatch(function () {
                tryLoadMoreEntities(listView);
            });
        }
        if (!skipTryLoadMore) {
            if (lastIndex >= 0) {
                msls_subscribe(msls_layout_updatedNotification, onLayoutUpdated);
            } else {
                msls_dispatch(function () {
                    tryLoadMoreEntities(listView);
                });
            }
        }
        updateListViewEmpty(listView);

        if (addedElements.length > 0) {
            if (listView._itemHasAttachedLabel) {
                msls_setAttachedLabelWidth($elements);
            }
            msls_updateLayout($elements, true);
            if (msls_verticalScrollbarSize && !listViewContentItem._isVStretch) {
                msls_updateLayout();

                msls_notify("LayoutUpdateIgnoreNotification");
            }
        }
    }

    function changeFocusableItem(listView, $itemToFocus) {

        listView._focusableItem.attr(html_tabIndex_Attribute, "-1");

        listView._focusableItem = $itemToFocus;
        $itemToFocus.attr(html_tabIndex_Attribute, "0");
    }

    function removeListItems(listView, items) {

        if (!items || items.length === 0) {
            return;
        }

        var
            itemsToSearch = items.slice(0),
            childContentItems = listView.data.children,
            i, len,
            childIndex,
            removingIndices = [],
            childContentItem,
            childContentItemView,
            $item,
            $itemToFocus;

        for (i = 1, len = childContentItems.length; i < len; i++) {
            childIndex = itemsToSearch.indexOf(
                childContentItems[i].data);
            if (childIndex > -1) {
                removingIndices.push(i);
                itemsToSearch.splice(childIndex, 1);
            }
            if (itemsToSearch.length === 0) {
                break;
            }
        }

        for (i = removingIndices.length - 1; i >= 0; i--) {
            childIndex = removingIndices[i];
            childContentItem = childContentItems[childIndex];

            childContentItems.splice(childIndex, 1);

            childContentItemView = childContentItem._view;
            $item = childContentItemView.getView().parents(itemHtmlSelector);

            if ($item.attr(html_tabIndex_Attribute) === "0") {
                $itemToFocus = $item.next(itemHtmlTag);
                if (!$itemToFocus.length) {
                    $itemToFocus = $item.prev(itemHtmlTag);
                }
                if ($itemToFocus.length) {
                    changeFocusableItem(listView, $itemToFocus);
                } else {
                    listView._focusableItem = null;
                }
            }

            $item.remove();

            childContentItemView.parent = null;
            msls_dispose(childContentItemView);
            msls_dispose(childContentItem);
        }

        updateListViewEmpty(listView);
    }

    function onCollectionChange(listView, e) {

        if (listView._collectionPromise) {
            return;
        }

        var action = e.action,
            items = e.items;


        if (action === msls_CollectionChangeAction.add) {
            addListItems(listView, items, e.newStartingIndex, true);
        } else if (e.action === msls_CollectionChangeAction.remove) {
            removeListItems(listView, items);
        }
    }

    function notifyLoading(listView, isLoading) {
        msls_notify(loadingNotification, {
            listView: listView,
            isLoading: isLoading
        });
    }

    function onVisualCollectionExecutionResolved(listView, items, startIndex) {
        if (!listView._collection) {
            return;
        }

        listView._collectionPromise = null;
        msls_mark(msls_codeMarkers.listViewLoadDataLoaded);
        addListItems(listView, items, startIndex);
    }

    function joinVisualCollectionExecution(listView) {

        var visualCollection = listView._collection,
            collectionState = visualCollection.state,
            ulElement = listView._ulElement,
            loadingPromise;

        ulElement.next("." + msls_list_empty).remove();

        notifyLoading(listView, true);

        if (collectionState === _VisualCollectionState.loading) {
            (loadingPromise = listView._collectionPromise =
            visualCollection.load(true)).then(
                function success(count) {
                    if (listView._collectionPromise === loadingPromise) {
                        onVisualCollectionExecutionResolved(listView, visualCollection.data);
                    }
                },
                function failure(error) {
                }
            );
        } else {
            (loadingPromise = listView._collectionPromise =
            visualCollection.loadMore(true)).then(
                function success(result) {
                    if (listView._collectionPromise === loadingPromise) {
                        onVisualCollectionExecutionResolved(
                            listView, result.items, result.startIndex);
                    }
                },
                function failure(error) {
                }
            );
        }
    }

    function deleteChildContentItems(listView) {
        var children = listView.data.children,
            index,
            childContentItem;
        for (index = children.length - 1; index >= 1; index--) {
            childContentItem = children[index];
            msls_dispose(childContentItem._view);
            msls_dispose(childContentItem);
        }
        children.length = 1;
    }

    function onCollectionStateChange(listView) {

        var collectionState = listView._collection.state;
        if (collectionState !== _VisualCollectionState.idle) {

            if (collectionState === _VisualCollectionState.loading) {
                listView._ulElement.children(itemHtmlSelector).remove();
                deleteChildContentItems(listView);
                listView._focusableItem = null;
            }
            joinVisualCollectionExecution(listView);
        }
    }

    function onCollectionSelectedItemChange(listView) {

        var ulElement = listView._ulElement,
            selectedItem = listView._collection.selectedItem,
            selectingElement,
            element;

        if (listView._collectionPromise) {
            return;
        }

        if (selectedItem) {
            selectingElement = listView._selectingElement;
            listView._selectingElement = null;

            if (!selectingElement) {
                ulElement.children(itemHtmlSelector).each(function () {
                    element = $(this);
                    if (element.data(itemDataKey) === selectedItem) {
                        selectingElement = element;
                        return false;
                    }
                    return true;
                });
            }

        }

        if (!selectingElement ||
            !selectingElement.hasClass(ui_btn_active)) {
            ulElement.find(itemHtmlSelector + "." + ui_btn_active).removeClass(ui_btn_active);

            if (selectingElement) {
                selectingElement.addClass(ui_btn_active);
            }
        }

        if (selectingElement) {
            changeFocusableItem(listView, selectingElement);
        }
    }

    function updateLoadingIndicator(listView) {

        var collection = listView._collection,
            isIdle = collection.state === _VisualCollectionState.idle;

        if (!!collection.loadError || (isIdle && !collection.canLoadMore)) {
            if (listView._loadingIndicator) {
                listView._loadingIndicator.remove();
                listView._loadingIndicator = null;
            }
        } else {
            if (!listView._loadingIndicator) {
                listView._loadingIndicator = $("<div class='" + msls_list_loading + "'></div>").insertAfter(listView._ulElement);
            }
        }
    }

    function getListItems(listView) {
        return listView._ulElement.children(itemHtmlTag);
    }

    function getNextOrPreviousRowItem(listView, $focusedItem, action) {
        var $items = getListItems(listView),
            itemsLen = $items.length,
            focusedItemIndex = $items.index($focusedItem),
            itemsPerRow = Math.floor(
                listView._ulElement.width() / $focusedItem.outerWidth(true));
        if (action === listViewChangeFocusAction.nextRow) {
            focusedItemIndex += itemsPerRow;
        } else {
            focusedItemIndex -= itemsPerRow;
        }
        if (focusedItemIndex < 0) {
            focusedItemIndex += (itemsLen + itemsPerRow -
                itemsLen % itemsPerRow);
            if (focusedItemIndex > itemsLen - 1) {
                focusedItemIndex -= itemsPerRow;
            }
        } else if (focusedItemIndex >= itemsLen) {
            focusedItemIndex = focusedItemIndex % itemsPerRow;
        }
        return $($items[focusedItemIndex]);
    }

    function ensureFocusedItemInView(listView, $focusedItem) {
        var $activePage,
            headerHeight,
            footerHeight,
            $window,
            windowScrollTop,
            shouldScroll,
            focusedItemViewTop,
            focusedItemViewOffset;

        if (!listView.data._isVStretch) {
            $activePage = $.mobile.activePage;
            $window = $(window);
            windowScrollTop = $window.scrollTop();
            focusedItemViewTop = $focusedItem.offset().top - windowScrollTop;

            headerHeight = $("div[data-role='header']", $activePage)
                .outerHeight();
            if (headerHeight) {
                focusedItemViewOffset = focusedItemViewTop - headerHeight;
                shouldScroll = focusedItemViewOffset < 0;
            }
            if (!shouldScroll) {
                footerHeight = $("div[data-role='footer']", $activePage)
                    .outerHeight();
                if (footerHeight) {
                    focusedItemViewOffset = $focusedItem.outerHeight() -
                        ($window.height() - focusedItemViewTop -
                        footerHeight);
                    shouldScroll = focusedItemViewOffset > 0;
                }
            }
            if (shouldScroll) {
                $window.scrollTop(windowScrollTop + focusedItemViewOffset);
            }
        }
    }

    function changeItemFocus(listView, action) {
        var $focusedItem = listView._focusableItem,
            $itemToFocus;

        if (!$focusedItem || !$focusedItem.length) {
            $itemToFocus = getListItems(listView).first();
        } else {
            switch (action) {
                case listViewChangeFocusAction.previousItem:
                    $itemToFocus = $focusedItem.prev(itemHtmlTag);
                    if (!$itemToFocus.length) {
                        $itemToFocus = getListItems(listView).last();
                    }
                    break;
                case listViewChangeFocusAction.nextItem:
                    $itemToFocus = $focusedItem.next(itemHtmlTag);
                    if (!$itemToFocus.length) {
                        $itemToFocus = getListItems(listView).first();
                    }
                    break;
                case listViewChangeFocusAction.nextRow:
                case listViewChangeFocusAction.previousRow:
                    $itemToFocus = getNextOrPreviousRowItem(
                        listView, $focusedItem, action);
                    break;
                default:
                    break;
            }
        }

        if (!!$itemToFocus && !!$itemToFocus.length) {
            changeFocusableItem(listView, $itemToFocus);
            $itemToFocus.focus();
            ensureFocusedItemInView(listView, $itemToFocus);
        }
    }

    function selectFocusedItem(listView) {
        var $focusedItem = listView._focusableItem;
        if ($focusedItem) {
            $focusedItem.trigger("vclick");
        }
    }

    function selectOrDeselectFocusedItem(listView) {
        var $focusedItem = listView._focusableItem,
            focusedItemEntity,
            collection;

        if (!$focusedItem) {
            return;
        }

        focusedItemEntity = $focusedItem.data(itemDataKey);
        collection = listView._collection;
        if (collection.selectedItem === focusedItemEntity) {
            collection.selectedItem = null;
        } else {
            selectFocusedItem(listView);
        }
    }

    function onKeyDown(listView, e) {

        var jQueryMobileKeyCode = $.mobile.keyCode,
            keyCode = e.which,
            isTileList = listView._isTileList;

        switch (keyCode) {
            case jQueryMobileKeyCode.UP:
                if (isTileList) {
                    changeItemFocus(
                        listView, listViewChangeFocusAction.previousRow);
                } else {
                    changeItemFocus(
                        listView, listViewChangeFocusAction.previousItem);
                }
                break;
            case jQueryMobileKeyCode.DOWN:
                if (isTileList) {
                    changeItemFocus(
                        listView, listViewChangeFocusAction.nextRow);
                } else {
                    changeItemFocus(
                        listView, listViewChangeFocusAction.nextItem);
                }
                break;
            case jQueryMobileKeyCode.LEFT:
                if (isTileList) {
                    changeItemFocus(
                        listView, listViewChangeFocusAction.previousItem);
                } else {
                    return;
                }
                break;
            case jQueryMobileKeyCode.RIGHT:
                if (isTileList) {
                    changeItemFocus(
                        listView, listViewChangeFocusAction.nextItem);
                } else {
                    return;
                }
                break;
            case jQueryMobileKeyCode.SPACE:
                selectOrDeselectFocusedItem(listView);
                break;
            case jQueryMobileKeyCode.ENTER:
                selectFocusedItem(listView);
                break;
            default:
                return;
        }

        e.stopPropagation();
        e.preventDefault();
    }

    function onCreated(listView) {
        var collection = listView._collection,
            ulElement = listView._ulElement,
            scrollHelper,
            isIdle;

        if (!collection) {
            return;
        }


        msls_addAutoDisposeEventListener(collection, "collectionchange", listView, function (e) {
            onCollectionChange(listView, e.detail);
        });
        updateLoadingIndicator(listView);

        msls_addAutoDisposeChangeListener(collection, "state", listView, function () {
            onCollectionStateChange(listView);
            updateLoadingIndicator(listView);
        });
        msls_addAutoDisposeChangeListener(collection, "loadError", listView, function () {
            updateLoadingIndicator(listView);
        });

        msls_addAutoDisposeChangeListener(collection, "selectedItem", listView, function () {
            onCollectionSelectedItemChange(listView);
        });

        msls_mark(msls_codeMarkers.listViewLoadStart);

        scrollHelper = listView._scrollHelper =
            new msls.ui.controls.ScrollHelper(ulElement, listView.data);
        scrollHelper.addEventListener("scroll", function () {
            if (msls_shell._currentNavigationOperation) {
                return;
            }

            tryLoadMoreEntities(listView);
        });

        ulElement.on("keydown", function (e) {
            onKeyDown(listView, e);
        });

        if (collection.state !== _VisualCollectionState.idle) {
            joinVisualCollectionExecution(listView);

        } else {
            msls_setTimeout(function () {
                loadMoreEntities(listView);
            }, 1);
        }

        listView._onWindowResize = function () {
            tryLoadMoreEntities(listView);
        };
        $(window).on("resize", listView._onWindowResize);
    }

    msls_defineClass("ui.controls", "ListView", function ListView(view) {
        msls_ui_Control.call(this, view);
    }, msls_ui_Control, {
        controlName: "ListView",
        itemTap: msls_controlProperty(),

        _attachViewCore: function (templateData) {

            var listView = this,
                ulElement = listView._ulElement =
                msls_control_find(listView.getView(), "ul"),
                contentItem = listView.data,
                rowTemplateContentItem = contentItem.children[0],
                collection = listView._collection = contentItem.value,
                screenModel,
                isDynamicTile,
                controlModel = contentItem.controlModel;

            screenModel = contentItem.screen.details.getModel();
            this._uniqueName = screenModel.name + "-" + contentItem.name + "-" + (++instanceCount);
            listView._isTileList = controlModel.id === ":TileList";
            isDynamicTile = rowTemplateContentItem.properties[msls_builtIn_isDynamicTileProperty];

            if (listView._isTileList) {
                ulElement.addClass("msls-tile-list");
                ulElement.attr("data-msls-list-name", listView._uniqueName);
            }
            ulElement.append('<div class="msls-clear msls-empty" />');

            if (!listView._headerLabel) {
                listView._headerLabel = new msls.ui.controls.Text(
                    $("." + msls_control_header, listView.getView()));

                var isVisible = contentItem.properties[msls_builtIn_showHeaderProperty];
                msls_addOrRemoveClass(listView._headerLabel.getView(), !isVisible, msls_collapsed);

                var headerTextBinding = new msls.data.DataBinding(
                    "data.displayName", listView, "text", listView._headerLabel,
                    msls_data_DataBindingMode.oneWayFromSource);
                headerTextBinding.bind();
            }
            listView._headerLabel.render();

            if (!collection) {
                return;
            }

            addItemEventHandlers(listView);

            function onLayoutUpdated() {
                msls_unsubscribe(msls_layout_updatedNotification, onLayoutUpdated);
                msls_dispatch(function () {
                    onCreated(listView);
                });
            }

            msls_subscribe(msls_layout_updatedNotification, onLayoutUpdated);
            if (listView._isTileList && isDynamicTile) {
                listView._layoutUpdatingCallback = function (e) {
                    var $layoutRoots = e.detail,
                        $pageBeingUpdated = $layoutRoots.first().closest("div.ui-page"),
                        $owningPage = ulElement.closest("div.ui-page");

                    if ($pageBeingUpdated.is($owningPage) && $.mobile.activePage.is($owningPage)) {
                        updateTileWidth(listView);
                    }
                };
                msls_subscribe(msls_layout_updatingNotification, listView._layoutUpdatingCallback);
            }

            msls_notify(initializedNotification, listView);
            msls_ui_Control.prototype._attachViewCore.call(listView, templateData);
        },

        _customVisualStateHandler:
            function _customVisualStateHandler(e) {
                if (e.state === msls_VisualState.loading) {
                    e.custom = true;
                }
            },

        _onBeforeTap: function onBeforeTap(e) {
                msls_mark(msls_codeMarkers.listItemClicked);

                var ulElement = this._ulElement,
                    ulHtmlElement = ulElement[0],
                    element =  e.target,
                    elementParent = element.parentNode;

                if (element !== ulHtmlElement) {
                    while (elementParent !== ulHtmlElement) {
                        element = elementParent;
                        elementParent = element.parentNode;
                    }
                    if ($(element).hasClass("msls-li")) {
                        updateSelection(this, $(element));
                    }
                }
            },

        _onDispose:
            function _onDispose() {
                var me = this,
                    headerLabel = me._headerLabel,
                    globalStyle = me._globalStyle,
                    layoutUpdatingCallback = me._layoutUpdatingCallback;

                if (headerLabel) {
                    msls_dispose(headerLabel);
                    me._headerLabel = null;
                }
                if (globalStyle) {
                    globalStyle.remove();
                    me._globalStyle = null;
                }
                if (layoutUpdatingCallback) {
                    msls_unsubscribe(msls_layout_updatingNotification, layoutUpdatingCallback);
                    me._layoutUpdatingCallback = null;
                }

                msls_dispose(me._scrollHelper);

                me.itemTap = null;
                me._ulElement = null;
                me._collection = null;
                me._scrollHelper = null;

                $(window).off("resize", me._onWindowResize);
                me._onWindowResize = null;

                deleteChildContentItems(me);
            }
    }, {
        _fillTemplate:
            function _fillTemplate(view, contentItem, templateData) {

                var ulContainerClass = "",
                    rowTemplateContentItem = contentItem.children[0];

                if (contentItem._isVStretch) {
                    ulContainerClass = ' class="msls-vstretch msls-vscroll';
                } else {
                    ulContainerClass = ' class="msls-vauto';
                }
                if (!needReLayout(rowTemplateContentItem)) {
                    ulContainerClass += " " + msls_layout_ignore_children;
                }
                ulContainerClass += '"';
                $(msls_stringFormat(listViewTemplate, ulContainerClass))
                    .appendTo(view);
                view.addClass(msls_rows_layout);
            },
    });

    msls.ui.controls.ListView.prototype._propertyMappings = {
        properties: { itemTap: "itemTap" },
    };
}());

(function () {
    var _ModalPickerQueryObjectLoader,
        _ModalPickerListViewContentItemDetails,
        _ContentItemPresenter = msls.ui.controls.ContentItemPresenter,
        builtIn_showHeaderProperty = msls_getControlPropertyId("ShowHeader", "RootCollectionControl"),
        popupOpenedNotification = "modalPickerPopupOpened",
        popupClosedNotification = "modalPickerPopupClosed",
        contentItemService = msls.services.contentItemService,
        listViewModel,
        clearText;

    msls_defineClass(msls, "ModalPickerQueryObjectLoader",
        function ModalPickerQueryObjectLoader(
            query) {
            msls_CollectionLoader.call(this);

            msls_setProperty(this, "_baseQuery", query);
        },
        msls_CollectionLoader, {
            _getAddedEntities:
                function _getAddedEntities() {
                    return this._baseQuery._addedEntities;
                }
        }
    );
    _ModalPickerQueryObjectLoader = msls.ModalPickerQueryObjectLoader;
    msls_makeDataServiceQueryLoader(_ModalPickerQueryObjectLoader);

    msls_defineClass(
        msls,
        "ModalPickerListViewContentItemDetails",
        function (visualCollection) {
            var me = this;


            msls_setProperty(me, "_visualCollection", visualCollection);

            msls_addAutoDisposeChangeListener(
                visualCollection, "loadError",
                me, function () {
                    me.dispatchChange("loadError");
                });
        },
        null,
        {
            loadError: msls_observableProperty(
                null,
                function isLoaded_get() {
                    return this._visualCollection.loadError;
                }),
            _onDispose: function onDispose() {
                msls_setProperty(this, "_visualCollection", null);
            }
        });
    _ModalPickerListViewContentItemDetails = msls.ModalPickerListViewContentItemDetails;

    function _isReadOnlyOrDisabled(me) {
        var contentItem = me.data;
        return (!contentItem || !contentItem.isEnabled || contentItem.isReadOnly);
    }

    function _fillTemplate(view, contentItem, templateData) {


        var element = $('<a class="id-element" tabIndex="0" data-role="button" data-icon="arrow-d" data-mini="true" data-iconpos="right" />').appendTo(view),
            itemViewElement = $("<div></div>").appendTo(element),
            itemViewModel = contentItem.children[0];
        templateData.idElement = msls_getTemplateItemPath(view, element);
        templateData.itemViewElement = msls_getTemplateItemPath(view, itemViewElement);
        if (!!itemViewModel) {
            msls_createPresenterTemplate(itemViewElement, itemViewModel, templateData.itemViewData = {});
        }
    }

    function _attachViewCore(templateData) {
        var me = this,
            element = me._element = msls_getTemplateItem(me.getView(), templateData.idElement, ".id-element"),
            itemViewModel = me.data.children[0],
            itemView,
            itemViewElement = msls_getTemplateItem(me.getView(), templateData.itemViewElement);

        msls_ui_Control.prototype._attachViewCore.call(me, templateData);

        element.on("vclick", function (e) {
            element.focus();
            showPicker(me);
            e.preventDefault();
        });

        msls_handleKeyDownForTapAction(element);

        if (!itemViewModel) {
            return;
        }

        itemView = new msls.ui.controls.ContentItemPresenter(itemViewElement);
        itemView.parent = me;
        itemView.data = itemViewModel;

        itemView.attachView(templateData.itemViewData);
    }

    function _customVisualStateHandler(e) {
        if (e.state === msls_VisualState.loading) {
            e.custom = true;
        }
    }

    function _onDispose() {
        var me = this,
            visualCollection = me._visualCollection;
        if (!!visualCollection && !me.data.choicesSource) {
            msls_dispose(visualCollection);
        }
    }

    function showPicker(me) {

        if (_isReadOnlyOrDisabled(me)) {
            return;
        }

        var modalPickerContentItem = me.data,
            modalPickerContentItemModel = modalPickerContentItem.model,
            itemContentItemTemplate =
                modalPickerContentItem.children[0],
            detailsProperty = me.detailsProperty,
            loader,
            visualCollection = me._visualCollection,
            propertyModel,
            entityType,
            screenDetails,
            targetEntitySet,
            listViewControlModels,
            listViewCIP,
            listViewContentItem,
            listViewContentItemDetails,
            showClear =
                !!detailsProperty.value &&
                (!detailsProperty.entity ||
                 msls_Entity_getNavigationPropertyTargetMultiplicity(detailsProperty) === "ZeroOrOne");

        if (!visualCollection) {
            visualCollection = modalPickerContentItem.choicesSource;

            if (!visualCollection) {
                propertyModel =  detailsProperty.getModel();
                entityType = propertyModel.propertyType;

                screenDetails = modalPickerContentItem.screen.details;
                msls_iterate(screenDetails.dataWorkspace.details.properties.all())
                .each(function (dataServiceProperty) {
                    msls_iterate(dataServiceProperty.value.details.properties.all())
                    .each(function (entitySetProperty) {
                        if (entitySetProperty.getModel().entityType === entityType) {
                            targetEntitySet = entitySetProperty.value;
                        }
                        return !targetEntitySet;
                    });

                    return !targetEntitySet;
                });

                loader = new _ModalPickerQueryObjectLoader(targetEntitySet);
                visualCollection =
                    new msls.VisualCollection(modalPickerContentItem.screen.details, loader);

                visualCollection.load();
            }

            me._visualCollection = visualCollection;
        }

        if (!listViewModel) {
            listViewControlModels = msls_findGlobalItems(
                function isControl(globalItem) {
                    return globalItem.id === ":List";
                });
            listViewModel = {
                kind: "Collection",
                view: listViewControlModels[0]
            };
        }

        listViewModel.name = modalPickerContentItemModel.name + "AutoGeneratedListView";
        listViewModel.displayName = itemContentItemTemplate.displayName;
        listViewModel.childContentItems = [
            itemContentItemTemplate.model
        ];

        listViewContentItem = contentItemService.createContentItemTree(
            modalPickerContentItem.screen, listViewModel, modalPickerContentItem);
        modalPickerContentItem.children.pop();
        listViewContentItem.__value = visualCollection;
        listViewContentItem.__details = listViewContentItemDetails =
            new _ModalPickerListViewContentItemDetails(visualCollection);
        listViewContentItem._dictionary.setValue(builtIn_showHeaderProperty, false);

        if (showClear && !clearText) {
            clearText = msls_getResourceString("modalPicker_clear");
        }

        msls_modalView.show({
            buildContentCallback: function buildContent(content) {

                content.addClass("msls-modalpicker");
                if (msls_application.options.enableModalScrollRegions) {
                    content.addClass(msls_vscroll);
                }

                var $header = $('<div class="msls-vauto"/>').appendTo(content),
                    $clearLink,
                    listViewContainerElement = $("<div>")
                        .appendTo(content),
                    listView;

                if (showClear) {
                    $clearLink = $('<a href="#"/>')
                        .on("touchend", function () { })
                        .on("vclick", function (e) {
                            e.preventDefault();
                            detailsProperty.value = null;
                            msls_modalView.close();
                        })
                        .appendTo($('<div class="msls-modal-picker-clear-container msls-leaf"/>')
                            .appendTo($header))
                        .text(clearText);
                }
                $header.append($('<div class="msls-control-header msls-leaf"/>')
                    .append($('<div class="msls-text"/>')
                        .append($('<span class="id-element"/>')
                            .text(modalPickerContentItem.displayName))));

                listViewCIP = new _ContentItemPresenter(listViewContainerElement);
                listViewCIP.data = listViewContentItem;
                listViewCIP.render();
                listViewContainerElement.removeClass("msls-compact-padding");

                listView = listViewCIP.children[0];

                listView.itemTap = new msls.BoundCommand(
                    "_onItemTap",
                    me,
                    msls_createBoundArguments(visualCollection, [{ binding: "selectedItem" }]));

                msls_addLifetimeDependency(listView, listView.itemTap);

                msls_notify(popupOpenedNotification, {
                    modalPicker: me,
                    listView: listView,
                    clearLink: $clearLink
                });
            },
            disposeContentCallback: function disposeContent() {
                listViewContentItem.parent = null;
                msls_dispose(listViewCIP);
                msls_dispose(listViewContentItem);
                msls_dispose(listViewContentItemDetails);
            }
        }).then(function () {
            msls_notify(popupClosedNotification, {
                modalPicker: me,
            });
        });
    }

    function _onItemTap(item) {
        if (_isReadOnlyOrDisabled(this)) {
            return;
        }

        this.detailsProperty.value = item;
        msls_modalView.close();
    }

    msls_defineClass("ui.controls", "ModalPicker",
        function ModalPicker(view) {
            var me = this;
            msls_ui_Control.call(me, view);
        },
        msls_ui_Control, {
            controlName: "ModalPicker",
            item: msls_controlProperty(
                null, null, true),

            _attachViewCore: _attachViewCore,
            _customVisualStateHandler: _customVisualStateHandler,
            _onItemTap: _onItemTap,
            _onDispose: _onDispose
        }, {
            _fillTemplate: _fillTemplate
        }
    );
    msls.ui.controls.ModalPicker.prototype._propertyMappings = {
        value: "item",
        details: "detailsProperty"
    };
    msls.ui.controls.ModalPicker.prototype._editableProperties = {
        item: "value"
    };
}());

var msls_shellView;

(function () {

    var taskDataName = "msls-screen",
        msls_dismiss_dialog = "msls-dismiss-dialog",
        data_msls_tabName = "msls-tab-name",
        $body,
        $empty = $([]),
        $dialogOverlay,
        $progressOverlay,
        $progressIcon,
        saveIconClasses = "msls-progress-icon msls-progress-save-icon",
        jqmToggleIgnoreList = "a, button, input, select, textarea, .ui-header-fixed, .ui-footer-fixed, .ui-popup, li",

        data_msls_name = "data-msls-name",
        popupTemplateId = "popupTemplate",
        key_msls_previous_uiState = "msls-previous-uiState",

        delayBeforeShowingCommandProgress = 2000,
        showProgressOverlayAtTime = null,
        modalViewVisibleCount = 0,
        progressOverlayActive = false,
        checkForUnsavedChangesBeforeUnload = true,
        longRunningCount = 0,

        sharePointChromeStylesInitialized = false,

        navigationHistoryDepth = 5,

        customTransitions = [
            msls_dialog_transition,
            msls_nested_dialog_transition,
            msls_screen_transition
        ];

    function _restartApplication() {
        window.location.replace(window.location.href.replace(/#.*/, ""));
        return;
    }

    if (window.location.hash) {

        _restartApplication();
    }


    if ($.mobile) {
        $.mobile.autoInitializePage = false;

        $.mobile.pushStateEnabled = false;
    }


    function initialize() {

        var me = this;
        $body = $("body");

        if (!$body.attr("data-theme")) {
            $body.attr("data-theme", cssDefaultJqmTheme);
        }

        $.each(customTransitions, function (id, transition) {
            $.mobile.transitionHandlers[transition] = lightSwitchTransitionHandler;
        });

        $(window)
            .on("pagebeforechange", function (e, navigationData) {
                _handlePageBeforeChange(me, e, navigationData);
            })
            .on("pagechange", function (e, navigationData) {
                _handlePageChange(me, e, navigationData);
            })
            .on("beforeunload", function () {
                if (checkForUnsavedChangesBeforeUnload && msls_shell.anyNavigationUnitHasChanges()) {
                    return msls_getResourceString("shell_unsaved_message");
                } else {
                    return;
                }
            });

        $(window).on("updatelayout", function (e) {
            if ($.mobile.popup.active) {
                var $popup = $.mobile.activePage.find(".ui-popup-container.ui-popup-active > .ui-popup"),
                    popupElement,
                    pos;
                if ($popup.length) {
                    popupElement = $popup[0];
                    pos = popupElement._mslsCustomPosition;
                    if (pos) {
                        $popup.popup("reposition", pos);
                    } else {
                        $popup.popup("reposition", { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                    }
                }
            }
        });

        msls_subscribe(msls_layout_updatingNotification, function () {
            if (msls_shell.activeNavigationUnit) {
                var unit = msls_shell.activeNavigationUnit;
                if (unit.popup) {
                    _sizeAndCenterDialog(me,
                        _findPageIdFromNavigationUnit(me, unit));
                }
            }
        });

        msls_subscribe(msls_commandProgressStartNotification, function () {
            _startPossibleLongRunningOperation(me);
        });
        msls_subscribe(msls_commandProgressCompleteNotification, function () {
            _stopPossibleLongRunningOperation(me);
        });
        msls_subscribe(msls_shellCommandStartNotification, function (e) {
            if (e.detail.name === "saveChanges") {
                $progressIcon.addClass(saveIconClasses);
                _startPossibleLongRunningOperation(me, 50);
            }
        });
        msls_subscribe(msls_shellCommandCompleteNotification, function (e) {
            if (e.detail.name === "saveChanges") {
                _stopPossibleLongRunningOperation(me);
                $progressIcon.removeClass(saveIconClasses);
            }
        });
        msls_subscribe("modalViewShown", function () {
            modalViewVisibleCount++;
        });
        msls_subscribe("modalViewClosed", function () {
            modalViewVisibleCount--;
            _resetProgressOverlayCounter(me);
        });

        msls_subscribe(msls_layout_updatingNotification, function () {
            var $page = $(".ui-page.ui-page-active"),
                navigationUnit = _getNavigationUnit(me, $page[0].id);

            if (!navigationUnit.popup) {
                var $header = $("div[data-role='header']", $page),
                    $footer = $("div[data-role='footer']", $page),
                    paddingTop = $header.outerHeight().toString() + "px",
                    paddingBottom = $footer.outerHeight().toString() + "px";
                if ($page[0].style.paddingTop !== paddingTop) {
                    $page[0].style.paddingTop = paddingTop;
                }
                if ($page[0].style.paddingBottom !== paddingBottom) {
                    $page[0].style.paddingBottom = paddingBottom;
                }
            }
        });


        _createOverlays();
    }

    function _createOverlays() {
        $dialogOverlay = $("<div id='" + msls_id_dialog_overlay + "' class='" + _join(msls_overlay, msls_layout_ignore, msls_collapsed) + "'></div>")
            .appendTo($body);

        $progressOverlay = $("<div id='" + msls_id_progress_overlay + "' class='" + _join(msls_overlay, msls_layout_ignore, msls_collapsed) +
            "'><div class='msls-progress'><div class='" + msls_progress_icon + "'></div></div></div>")
            .appendTo($body);
        $progressIcon = $("." + msls_progress_icon, $progressOverlay);
    }


    function navigate(targetUnit) {
        var me = this;
        return new WinJS.Promise(function initNavigate(complete, error) {
            closePopup().then(function () {
                _navigateCore(me, targetUnit, complete, error);
            });
        });
    }

    function _navigateCore(me, targetUnit, complete, error) {

        var pageId;

        function private_createPage(localViewInfo) {

            msls_mark(msls_codeMarkers.createPageStart);

            if (targetUnit.popup) {
                var previousViewInfo = me._pageIdMapping[$.mobile.activePage[0].id];
                localViewInfo.backgroundPageId = previousViewInfo.backgroundPageId ? previousViewInfo.backgroundPageId : $.mobile.activePage[0].id;
            }

            var $page = _createUiForNavigationUnit(me, localViewInfo);

            msls_mark(msls_codeMarkers.createPageEnd);

            _showOrHideDialogBackground(localViewInfo);

            return $page;
        }

        if (me._initializeMobileOnce) {

            me.initialize();
        }

        if (targetUnit === msls_shell.activeNavigationUnit) {
            _changeActiveScreenTab(me, targetUnit, complete);
            return;
        }

        var existingPageId = _findPageIdFromNavigationUnit(me, targetUnit);
        if (existingPageId) {

            if ($("#" + existingPageId, $.mobile.pageContainer).length === 0) {
                _createScreenPage(me, existingPageId, targetUnit);
            }

            _goToPageInHistory(me, $.mobile.activePage[0].id, existingPageId, false, function () {

                var existingViewInfo = me._pageIdMapping[existingPageId];
                _showOrHideDialogBackground(existingViewInfo);

                complete();
                msls_mark(msls_codeMarkers.navigationBackEnd);
            });

            return;
        }

        var prefix = "";


        pageId = _createUniquePageId(me, prefix);
        if (!targetUnit.screen.details._pageId) {
            targetUnit.screen.details._pageId = pageId;
        }

        if (!me._firstPageId) {
            me._firstPageId = pageId;
        } else {
            $.mobile.activePage.data(
                key_msls_previous_uiState,
                {
                    activeElement: document.activeElement,
                    scrollTop: $(window).scrollTop()
                });
        }

        var viewInfo = {
            pageId: pageId,
            unit: targetUnit
        };
        me._pageIdMapping[pageId] = viewInfo;
        me._pageIdToIndexMapping[pageId] = targetUnit.index;

        if (me._initializeMobileOnce) {

            me._initializeMobileOnce = false;

            var homePage = private_createPage(viewInfo);

            homePage.css("opacity", 0);

            _awaitPageChange(me, pageId)
           .then(function success2() {
               _transitionOpeningScreen(me, $.mobile.activePage, function () {
                   $(".ui-page-active .ui-header").fixedtoolbar("updatePagePadding");
                   $.mobile.resetActivePageHeight();
                   complete();
               });
           }, function failure(e) {
               error(e);
           });

            $.mobile.initializePage();
        } else {

            var transitionName =
                targetUnit.popupDepth > 1 ? msls_nested_dialog_transition :
                targetUnit.popup ? msls_dialog_transition :
                msls_screen_transition;

            _createAndNavigateToPage(me, function () {
                return private_createPage(viewInfo);
            }, viewInfo, transitionName, function () {
                _removeOldPagesFromDOM(me, navigationHistoryDepth);
                complete();
            }, error);
        }
    }

    function awaitBrowserNavigation(targetUnit) {
        var me = this,
            targetPageId = _findPageIdFromNavigationUnit(me, targetUnit);

        return new WinJS.Promise(function initNavigate(complete, error) {
            _awaitPageChange(me, targetPageId).then(function () {
                complete();
                msls_mark(msls_codeMarkers.navigationBackEnd);
            });
        });
    }

    function _setShellIntroducedNavigation(me) {
        me._isShellIntroducedNavigation = true;
    }

    function _awaitPageChangeCompleted(me) {
        return new WinJS.Promise(function (complete) {
            me._completeOnHashChange = complete;
        });
    }

    function _parseUrl(me, url) {

        var pageId = $.mobile.path.parseUrl(url).hash;
        if (pageId) {
            pageId = pageId.replace(/^[^#]*#/, "");
        }
        if (!pageId) {
            pageId = me._firstPageId;
        }
        return { id: pageId, unit: _getNavigationUnit(me, pageId) };
    }

    function _getNavigationUnit(me, pageId) {
        var navigationUnitInfo = me._pageIdMapping[pageId],
            navigationUnit = navigationUnitInfo ? navigationUnitInfo.unit : null;


        return navigationUnit;
    }

    function _handlePageBeforeChange(me, e, navigationData) {

        if (!$.mobile.activePage) {
            return;
        }

        if (msls_modalView.isOpen()) {
            msls_modalView.close();
        }

        if (typeof navigationData.toPage === "string") {
            var parsed = _parseUrl(me, navigationData.toPage),
                newPageId = parsed.id,
                newNavigationUnit = parsed.unit;


            if ($("#" + newPageId, $.mobile.pageContainer).length === 0) {

                if (newNavigationUnit) {
                    _createScreenPage(me, newPageId, newNavigationUnit);
                } else {
                    _createExpiredPage(me, newPageId);
                }
            }
        } else {
        }
    }

    function _handlePageChange(me, e, navigationData) {
        var activePage = $.mobile.activePage,
            previousUIState;


        var $previousPage = navigationData.options.fromPage;
        if (!!$previousPage && $previousPage.is("." + msls_page_expired)) {
            $previousPage.remove();
        }

        if (!!activePage && activePage.hasClass(msls_dialog)) {
            msls_handleDialogFocus(activePage);
        }

        previousUIState = activePage.data(key_msls_previous_uiState);
        if (previousUIState) {
            $(previousUIState.activeElement).focus();
            msls_restoreScrollPosition($(window), previousUIState.scrollTop);
        }

        if (me._completeOnHashChange) {
            var completeOnHashChange = me._completeOnHashChange;
            me._completeOnHashChange = null;

            msls_dispatch(function () {
                completeOnHashChange();
            });
        }

        if (customTransitions.indexOf(navigationData.options.transition) < 0) {
            msls_notify("BrowserNavigationPromise", new WinJS.Promise(function (success) { success(); }));
        }
    }

    function _syncAfterBrowserInitiatedNavigations(me, $toPage) {

        if (me._isShellIntroducedNavigation) {

            me._isShellIntroducedNavigation = false;
            return null;
        }


        if (longRunningCount) {
            msls_subscribeOnce(msls_commandProgressCompleteNotification, function () {
                if (!longRunningCount) {
                    msls_modal_showError(msls_getResourceString("shell_conflicting_operations"))
                        .then(function () { _restartApplication(); });
                }
            });
            return;
        }

        var newPageId = $toPage[0].id,
            navigationUnitInfo = me._pageIdMapping[newPageId],
            newNavigationUnit,
            promise = null;

        if (navigationUnitInfo) {
            _showOrHideDialogBackground(navigationUnitInfo);

            newNavigationUnit = navigationUnitInfo.unit;


            if (msls_shell.navigationInProgress) {
            } else {
                promise = msls_shell.synchronizeAfterBrowserNavigation(newNavigationUnit);
            }
        }
        msls_notify("BrowserNavigationPromise", _awaitPageChange(me, newPageId));
        return promise;
    }

    function _createAndNavigateToPage(me, createPage, viewInfo, transitionName, complete, error) {

        msls_suspendLayout();

        _resetProgressOverlayCounter(me);

        var $outs = $.mobile.activePage;

        WinJS.Promise.join([
        ])
        .then(function () {
            msls_mark(msls_codeMarkers.transitionPrepare);

            $outs.addClass(msls_out);
            $body.addClass(transitionName + " " + msls_stage1);

            if (transitionName === msls_dialog_transition) {
                msls_addOrRemoveClass($dialogOverlay, true, msls_overlay_active, msls_collapsed);
                return helper_delay(1);
            }

            return helper_delay(167);
        })
        .then(function () {
            return (transitionName === msls_dialog_transition) ? helper_delay(1) : null;
        })
        .then(function () {
            var jqueryMobilePage = createPage(),
                promises = [];

            $outs.removeClass(ui_page_active);
            $body.removeClass(msls_stage1);

            promises.push(_awaitPageChange(me, jqueryMobilePage[0].id));

            promises.push(_awaitPageChangeCompleted(me));

            WinJS.Promise.join(promises)
            .then(function success() {

                complete();
            }, function failure(e) {
                error(e);
            });

            msls_resumeLayout();
            msls_mark(msls_codeMarkers.changePageStart);

            _setShellIntroducedNavigation(me);
            $.mobile.changePage(jqueryMobilePage, { transition: transitionName, reverse: false });

            msls_mark(msls_codeMarkers.changePageEnd);
        })
        .then(null, function (e) {
            error(e);
        });
    }

    function _awaitPopupOpened(me, expectedPopupId) {

        return new WinJS.Promise(function (c, e) {
            $(window).one("popupafteropen", function (evt) {
                var newPopupId = evt.target.id;
                if (newPopupId === expectedPopupId) {
                    c();
                } else {
                    e(msls_getResourceString("shell_nav_failed"));
                }
            });
        });
    }

    function _awaitPageChange(me, expectedPageId) {

        return new WinJS.Promise(function initAwaitPageChange(complete, error) {
            $(window).one("pageshow", function () {
                var newActivePage = $.mobile.activePage;
                if (!!newActivePage && (newActivePage.length === 1) && (newActivePage[0].id === expectedPageId)) {
                    complete();
                    msls_mark(msls_codeMarkers.navigationEnd);
                } else {
                    error(msls_getResourceString("shell_nav_failed"));
                }
            });
        });
    }


    function _findPageIdFromNavigationUnit(me, navigationUnit) {

        var pageId;
        $.each(me._pageIdMapping, function (id, info) {
            if (info.unit === navigationUnit) {
                pageId = id;
            }
        });

        return pageId;
    }

    function _goToPageInHistory(me, currentPageId, targetPageId, hideHashChangeFromJqueryMobile, doneHandler) {


        var
            currentIndex = me._pageIdToIndexMapping[currentPageId],
            targetIndex = me._pageIdToIndexMapping[targetPageId];

        if (typeof currentIndex === "undefined" || typeof targetIndex === "undefined") {
            _restartApplication();
            return;
        }

        if (targetIndex !== currentIndex) {
            var promises = [];

            promises.push(_awaitPageChangeCompleted(me));

            if (hideHashChangeFromJqueryMobile) {
                me._stopHashChangePropagationOnce = true;
            } else {
                promises.push(_awaitPageChange(me, targetPageId));
            }

            WinJS.Promise.join(promises)
            .then(function success() {
                var actualId = window.location.hash.replace(/^#/, "") || me._firstPageId;
                if (actualId === targetPageId) {
                    msls_dispatch(function () {
                        doneHandler();
                    });
                } else {
                    doneHandler(msls_getResourceString("shell_nav_failed"));
                }
            }, function failure(error) {
                doneHandler(error);
            });

            msls_mark(msls_codeMarkers.goUrlStart);
            _setShellIntroducedNavigation(me);
            window.history.go(targetIndex - currentIndex);
            msls_mark(msls_codeMarkers.goUrlEnd);
        } else {
            doneHandler();
        }
    }

    function _removeOldPagesFromDOM(me, pagesDeep) {

        var removePageIndex = -1;
        pagesDeep = pagesDeep || 1;

        if (!msls_shell.activeNavigationUnit.popupDepth && !!$.mobile.activePage) {
            var currentPageIndex = me._pageIdToIndexMapping[$.mobile.activePage[0].id];

            removePageIndex = currentPageIndex - pagesDeep;
        }

        if (removePageIndex > 0) {
            var unit = msls_shell.navigationStack[removePageIndex],
                removePageId = _findPageIdFromNavigationUnit(me, unit);

            $("#" + removePageId, $.mobile.pageContainer).remove();
            unit.cleanPageUiControls();
        }
    }

    function onNavigationUnitClosed(navigationUnit) {

        var pageId = _findPageIdFromNavigationUnit(this, navigationUnit),
            unitViewInfo = this._pageIdMapping[pageId];

        if (pageId) {

            delete this._pageIdMapping[pageId];

            var element = $("#" + pageId, $.mobile.pageContainer);
            element.remove();
        }
        var task = unitViewInfo.unit.task,
            taskUses = msls_getValues(this._pageIdMapping).filter(function (infoEntry) {
                return infoEntry.unit.task === task;
            });

        msls_dispose(navigationUnit);

        if (!taskUses.length) {
            var screenObject = task.screen;

            msls_dispose(task);
            msls_dispose(screenObject.details);
        }
    }

    function _showOrHideDialogBackground(viewInfo) {
        $(".ui-page").removeClass(msls_background_page);
        var backgroundPageId = viewInfo.backgroundPageId;
        if (backgroundPageId) {
            $("#" + backgroundPageId).addClass(msls_background_page);
        }

        if (!viewInfo.unit.popup) {
            msls_addOrRemoveClass($dialogOverlay, false, msls_overlay_active, msls_collapsed);
        }
    }


    function _isCancelShortCutKey(e) {
        if (e.which === $.mobile.keyCode.ESCAPE) {
            return e.target.nodeName.toLowerCase() !== "select";
        }
        return false;
    }

    function _isCommitShortCutKey(e) {
        var keyCode = e.which;

        return keyCode === 83 && e.ctrlKey;
    }

    function _handleScreenKeyboardShortCuts($page, navigationUnit) {

        var buttonsNeeded = navigationUnit._buttonsNeeded,
            showCancel;

        if (!buttonsNeeded) {
            return;
        }
        showCancel = buttonsNeeded.showSaveDiscard ||
            buttonsNeeded.showOkCancel;
        if (!(showCancel || buttonsNeeded.showOk)) {
            return;
        }

        $page.keydown(function (e) {
            if (msls_shell._currentNavigationOperation ||
                $.mobile.popup.active) {
                return;
            }

            if (showCancel && _isCancelShortCutKey(e)) {
                msls_shell.cancelChanges();
                return false;
            } else if (_isCommitShortCutKey(e)) {
                msls_shell.commitChanges();
                return false;
            }
        });
    }

    function _createUiForNavigationUnit(me, viewInfo) {

        var pageId = viewInfo.pageId,
            targetUnit = viewInfo.unit,
            isScreen = viewInfo.unit.contentItemTree.kind === msls_ContentItemKind.tab,
            $page =
                !targetUnit.popup ? _createScreenPage(me, pageId, targetUnit) :
                _createScreenDialogPage(me, pageId, targetUnit);

        return $page;
    }

    function _createEmptyPage() {


        var $page = $("<div data-role='page'" +
            "></div>");
        $page.attr("data-theme", $body.jqmData("theme") || cssDefaultJqmTheme);
        return $page;
    }

    function _setPageIds($page, pageId) {


        $page.attr("id", pageId);
        $page.attr("data-url", pageId);
    }

    function _createHeaderControl(navigationUnit, $header, dataTemplate) {

        var headerControl = new msls.ui.controls.ContentControl($header),
            enabledButtonsSelector = ".msls-large-icon:not('.msls-collapsed')",
            $buttonsRow,
            $enabledButtons;

        dataTemplate = _fillInScreenTabHeadersPlaceholder(dataTemplate);

        headerControl.dataTemplate = dataTemplate;
        headerControl.data = navigationUnit;
        headerControl.render();
        navigationUnit.registerPageUiControl(headerControl);

        $buttonsRow = $(".msls-buttons-row", $header);
        $enabledButtons = $(enabledButtonsSelector, $buttonsRow);
        if ($enabledButtons.length > 0) {
            msls_handleContainerKeyboardNavigation(
                $buttonsRow, enabledButtonsSelector);
        }
    }

    function _createScreenFrameHeader(me, navigationUnit) {

        var $header = $("<div class='msls-header' data-role='header' data-position='fixed' data-update-page-padding='false' data-tap-toggle-blacklist='" + jqmToggleIgnoreList + "'></div>"),
            dataTemplate = msls_templateStrings[taskHeaderTemplateId],
            buttonsNeeded = _determineButtonsNeeded(navigationUnit),
            mainButtonsTemplate,
            logoBackTemplate,
            logoutTemplate;

        mainButtonsTemplate = buttonsNeeded.showSaveDiscard ? "screenSaveDiscardTemplate" :
            buttonsNeeded.showOk ? "screenOkTemplate" :
            buttonsNeeded.showOkCancel ? "screenOkCancelTemplate" :
            null;
        logoBackTemplate =
            buttonsNeeded.showLogo ? "screenLogoTemplate" :
            buttonsNeeded.showBackClose ? "screenBackTemplate" :
            null;
        logoutTemplate = buttonsNeeded.showLogOut ? "screenLogoutTemplate" : null;

        dataTemplate = dataTemplate
            .replace("BUTTONS-PLACEHOLDER", msls_templateStrings[mainButtonsTemplate] || "")
            .replace("LOGO-BACK-PLACEHOLDER", msls_templateStrings[logoBackTemplate] || "")
            .replace("LOGOUT-PLACEHOLDER", msls_templateStrings[logoutTemplate] || "");

        _createHeaderControl(navigationUnit, $header, dataTemplate);

        $("." + msls_logo + " img", $header).on("error", function () {
            $("." + msls_logo).addClass(msls_collapsed);
        });

        return $header;
    }


    function _createScreenPage(me, pageId, navigationUnit) {

        var $page = _createEmptyPage();
        _setPageIds($page, pageId);

        var $header = _createScreenFrameHeader(me, navigationUnit).
            appendTo($page);

        var $pageContentRoot = $(msls_templateStrings[contentTemplateId])
                .appendTo($page),
            $footer = $(msls_templateStrings[screenFooterTemplateId])
                .appendTo($page),
            $headerFooter = $header.add($footer);

        $pageContentRoot.focusin(function (e) {
            $headerFooter.each(function () {
                var instance = $(this).data("mobile-fixedtoolbar");
                if (!!instance && $(e.target).is(instance.options.hideDuringFocus)) {
                    $(this).fixedtoolbar("hide");
                }
            });
        });

        $footer.on("updatelayout", function (e) {
            var pageStyle = $page[0].style,
                paddingBottom = $footer.outerHeight().toString() + "px";
            if (pageStyle.paddingBottom !== paddingBottom) {
                pageStyle.paddingBottom = paddingBottom;
            }
        });

        $page.appendTo($body);
        _fillInScreenContent(me, $page, $pageContentRoot, navigationUnit);
        _setPageLayoutOptions($page, navigationUnit);

        _handleScreenKeyboardShortCuts($page, navigationUnit);
        return $page;
    }

    function _createExpiredPage(me, pageId) {

        var $page = _createEmptyPage()
            .addClass(msls_page_expired);
        _setPageIds($page, pageId);

        $("<h2 class='msls-page-expired-message'>" +
            msls_getResourceString("shell_page_expired_message") + "</h2>").appendTo($page);

        return $page.appendTo($body);
    }

    function _setPageLayoutOptions($page, navigationUnit) {

        var isVStretch = navigationUnit.popup || navigationUnit.contentItemTree._isVStretch,
            $content = $(".msls-content", $page);


        if (!navigationUnit.popup) {
            msls_addOrRemoveClass($page, isVStretch, msls_vstretch, msls_vauto);
        }
        msls_addOrRemoveClass($content, isVStretch, msls_vstretch + " " + msls_vscroll, msls_vauto);
        if (!isVStretch) {
            $page[0].style.height = "";
            $content[0].style.height = "";
        }
    }

    function _fillInScreenTabHeadersPlaceholder(headerHtml) {

        return headerHtml.replace("TAB-BUTTONS-PLACEHOLDER", msls_templateStrings[tabsBarTemplateId]);
    }

    function _fillInScreenContent(me, $page, $pageContentRoot, navigationUnit) {


        _addScreenTabContent(me, $page, navigationUnit, false)
            .addClass(msls_tab_content_active);

        _addTabFooterContent(me, $page, navigationUnit, false)
            .addClass(msls_footer_content_active);

        if (!navigationUnit.popup && !!msls_sharepoint) {
            _addSharePointChromeInternal($page, navigationUnit);
        }
    }

    function _addContentForRootContentItemTree(me, contentItemTree, $rootNode, templateData) {


        msls_mark(msls_codeMarkers.createPageControlsStart);

        var pageRootControl = new msls.ui.controls.ContentItemPresenter($rootNode);
        pageRootControl.data = contentItemTree;
        pageRootControl.attachView(templateData);

        msls_mark(msls_codeMarkers.createPageControlsEnd);


        return pageRootControl;
    }

    function _addScreenTabContent(me, $screenRoot, navigationUnit, enhance) {

        var tabName = navigationUnit.pageName,
            $tabsContainer = $("." + msls_content, $screenRoot),
            tabContentItem = navigationUnit.contentItemTree,
            contentDefinition = tabContentItem.model,
            contentItemTree = navigationUnit.contentItemTree,
            cacheResult,
            $tabContentRoot,
            templateData;

        cacheResult = _createFromCache(contentDefinition, "__tabCache", function (templateDataOut) {
            var $tabContentRootTemplate = $("<div class=''></div>")
                .addClass(msls_tab_content)
                .attr(data_msls_tabName, tabName);

            msls_createPresenterTemplate($tabContentRootTemplate, contentItemTree, templateDataOut);

            return $tabContentRootTemplate;
        });
        $tabContentRoot = cacheResult.$element;
        templateData = cacheResult.templateData;

        $tabContentRoot.appendTo($tabsContainer);
        var contentControl = _addContentForRootContentItemTree(me, contentItemTree, $tabContentRoot, templateData);
        navigationUnit.registerPageUiControl(contentControl);

        if (enhance) {
            $tabContentRoot.trigger("create");
        }

        return $tabContentRoot;
    }

    function _addTabFooterContent(me, $screenRoot, navigationUnit, enhance) {

        var tabName = navigationUnit.pageName,
            $footer = $("." + msls_footer, $screenRoot),
            tabContentItem = navigationUnit.contentItemTree,
            $tabFooterContent,
            templateData,
            cacheResult,
            commandItems = navigationUnit.contentItemTree.commandItems || [],
            visibleButtonsSelector =
                ".msls-ctl-command-bar-button:not('.msls-collapsed')";

        function onUpdateLayout(e) {
            var $button = $(e.target);
            msls_updateContainerFocusItem(
                $tabFooterContent, visibleButtonsSelector, $button);
        }

        $tabFooterContent = $(msls_templateStrings[footerContentTemplateId])
                .appendTo($footer)
                .attr(data_msls_tabName, tabName);

        for (var i = 0; i < commandItems.length; i++) {
            var commandItem = commandItems[i],
                $buttonView = $('<div tabindex="-1"></div>'),
                buttonPresenter = new msls.ui.controls.ContentItemPresenter($buttonView);
            buttonPresenter.data = commandItem;
            buttonPresenter.render();
            $tabFooterContent.append($buttonView);
            navigationUnit.registerPageUiControl(buttonPresenter);

            $buttonView.on("updatelayout", onUpdateLayout);
        }

        if (enhance) {
            $tabFooterContent.trigger("create");
        }

        msls_handleContainerKeyboardNavigation(
            $tabFooterContent, visibleButtonsSelector);

        return $tabFooterContent;
    }

    function _createTemplateForDialogFrame_helper(templateDataOut) {

        var dialogPage = _createEmptyPage().
                addClass(msls_dialog);

        var outerFrame = $("<div class='msls-dialog-frame'></div>").appendTo(dialogPage),
            theme = $body.jqmData("theme") || cssDefaultJqmTheme,
            innerFrame = $("<div class='msls-dialog-inner-frame ui-body-" + theme + " msls-rows-layout msls-fixed-height'></div>").
                appendTo(outerFrame);

        var header = $("<div class='msls-header msls-vauto msls-hauto' data-role='header'></div>")
                .appendTo(innerFrame),
            pageContentContainer = $(msls_templateStrings[contentTemplateId])
                .appendTo(innerFrame),
            $footer;

        $footer = $(msls_templateStrings[dialogFooterTemplateId])
            .appendTo(innerFrame);

        templateDataOut.headerElement = msls_getTemplateItemPath(dialogPage, header);
        templateDataOut.pageContentContainerElement = msls_getTemplateItemPath(dialogPage, pageContentContainer);

        return dialogPage;
    }

    function _createTemplateForPopupFrame(popupContentItem, templateDataOut) {

        var theme = $body.jqmData("theme") || cssDefaultJqmTheme,
            $frame = $(msls_templateStrings[popupTemplateId])
            .attr("data-theme", theme);

        var $contentContainer = $(".msls-popup-content", $frame);

        msls_createPresenterTemplate($contentContainer, popupContentItem, templateDataOut);

        templateDataOut.contentContainerElement = msls_getTemplateItemPath($frame, $contentContainer);

        return $frame;
    }

    function _createTemplateForScreenDialogFrame(templateDataOut) {

        return _createTemplateForDialogFrame_helper(templateDataOut);
    }

    function _fillDialogHeader($dialogPage, navigationUnit, templateData) {

        var $header = msls_getTemplateItem($dialogPage, templateData.headerElement),
            buttonsNeeded = _determineButtonsNeeded(navigationUnit),
            dataTemplate,
            dialogButtonsTemplate;

        dialogButtonsTemplate = buttonsNeeded.showSaveDiscard ? "dialogSaveDiscardTemplate" :
            buttonsNeeded.showOk ? "dialogOkTemplate" :
            buttonsNeeded.showOkCancel ? "dialogOkCancelTemplate" :
            buttonsNeeded.showBackClose ? "dialogCloseTemplate" :
            null;

        dataTemplate = msls_templateStrings[dialogHeaderTemplateId]
            .replace("BUTTONS-PLACEHOLDER", msls_templateStrings[dialogButtonsTemplate] || "");

        _createHeaderControl(navigationUnit, $header, dataTemplate);
    }


    function _createPopup(me, popupId, $page, rootContentItem) {


        var definition = rootContentItem.model,
            cacheResult,
            $popup,
            templateData;

        cacheResult = _createFromCache(definition, "__popupCache", function (templateDataOut) {
            return _createTemplateForPopupFrame(rootContentItem, templateDataOut);
        });
        $popup = cacheResult.$element;
        templateData = cacheResult.templateData;

        var $pageContent = $(msls_content_selector, $page);
        $popup.appendTo($pageContent)
            .attr("id", popupId)
            .attr(data_msls_name, rootContentItem.name);

        var $contentRoot = msls_getTemplateItem($popup, templateData.contentContainerElement),
            contentControl = _addContentForRootContentItemTree(me, rootContentItem, $contentRoot, templateData);
        msls_shell.activeNavigationUnit.registerPageUiControl(contentControl);

        return $popup;
    }


    function _createScreenDialogPage(me, pageId, navigationUnit) {


        var cacheResult,
            $screenDialogPage,
            screenDialogTemplateData;

        cacheResult = _createFromCache(me, "_blankScreenDialogFrameCache", function (templateOut) {
            return _createTemplateForScreenDialogFrame(templateOut);
        });
        $screenDialogPage = cacheResult.$element;
        screenDialogTemplateData = cacheResult.templateData;

        _fillDialogHeader($screenDialogPage, navigationUnit, screenDialogTemplateData);

        _setPageIds($screenDialogPage, pageId);
        $screenDialogPage.appendTo($body);

        var $pageContentRoot = msls_getTemplateItem($screenDialogPage, screenDialogTemplateData.pageContentContainerElement);
        _fillInScreenContent(me, $screenDialogPage, $pageContentRoot, navigationUnit);
        _setPageLayoutOptions($screenDialogPage, navigationUnit);

        _handleScreenKeyboardShortCuts($screenDialogPage, navigationUnit);
        return $screenDialogPage;
    }

    function _createUniquePageId(me, prefix) {

        var id,
            ceiling = 4294967296;
        while (!id || id in me._pageIdToIndexMapping) {
            var startLetter = (Math.floor(Math.random() * 6 + 10)).toString(16);

            id = prefix + startLetter + (Math.floor(Math.random() * ceiling)).toString(16);
        }

        return id;
    }

    function _changeActiveScreenTab(me, navigationUnit, complete) {

        var tabName = navigationUnit.pageName,
            viewInfo = me._pageIdMapping[_findPageIdFromNavigationUnit(me, navigationUnit)],
            $page = $("#" + viewInfo.pageId),
            tabContent = msls_iterate($("." + msls_tab_content, $page).toArray())
                .where(function (element) {
                    return $(element).attr(data_msls_tabName) === tabName;
                }).first(),
            tabFooter = msls_iterate($("." + msls_footer_content, $page).toArray())
                .where(function (element) {
                    return $(element).attr(data_msls_tabName) === tabName;
                }).first(),
            needsFullLayout = false,
            $tabContent,
            $tabFooter;

        if (!tabContent) {
            msls_suspendLayout();
            try {
                $tabContent = _addScreenTabContent(me, $page, navigationUnit, true);
                needsFullLayout = true;
            } finally {
                msls_resumeLayout(false);
            }
        } else {
            $tabContent = $(tabContent);
        }

        if (!tabFooter) {
            msls_suspendLayout();
            try {
                $tabFooter = _addTabFooterContent(me, $page, navigationUnit, true);
                needsFullLayout = true;
            } finally {
                msls_resumeLayout(false);
            }
        } else {
            $tabFooter = $(tabFooter);
        }

        var $fromContent = $("." + msls_tab_content_active, $page),
            $toContent = $tabContent,
            $fromFooter = $("." + msls_footer_content_active, $page),
            $toFooter = $tabFooter,
            $headerFooter = $("." + msls_footer + ", ." + msls_header, $page);

        _setPageLayoutOptions($page, navigationUnit);
        _transitionTabs(me, $fromContent, $toContent, $fromFooter, $toFooter, $headerFooter, needsFullLayout, complete);
    }


    function logout() {

        function doLogout() {
            window.location.href = msls_appRootUri + "/LogOut.aspx";
        }

        if (msls_shell.anyNavigationUnitHasChanges()) {
            msls_modal.show({
                message: msls_getResourceString("shell_unsaved_message"),
                title: msls_getResourceString("shell_save_title"),
                buttons: [
                    {
                        text: msls_getResourceString("shell_logout_btn"), icon: "check", result: msls_modal_DialogResult.yes
                    },
                    {
                        text: msls_getResourceString("shell_stay_btn"), icon: "back", result: msls_modal_DialogResult.no
                    }],
                defaultResult: msls_modal_DialogResult.no
            }).then(function (result) {
                if (result === msls_modal_DialogResult.yes) {
                    checkForUnsavedChangesBeforeUnload = false;
                    doLogout();
                }
            });
        } else {
            doLogout();
        }
    }


    function _startPossibleLongRunningOperation(me, delayOverride) {

        longRunningCount++;
        _setProgressOverlayCounter(me, delayOverride);
    }

    function _stopPossibleLongRunningOperation(me) {

        longRunningCount--;

        if (longRunningCount <= 0) {
            progressOverlayActive = false;
            showProgressOverlayAtTime = null;
            _updateProgressOverlay(me);
        }
    }

    function _resetProgressOverlayCounter(me) {
        showProgressOverlayAtTime = 0;
        _setProgressOverlayCounter(me);
    }

    function _setProgressOverlayCounter(me, delayOverride) {

        if (longRunningCount > 0) {
            var delay = delayOverride ? delayOverride : delayBeforeShowingCommandProgress;

            var showAtTime = Date.now() + delay;
            if (!showProgressOverlayAtTime || showAtTime < showProgressOverlayAtTime) {
                showProgressOverlayAtTime = showAtTime;
                msls_setTimeout(function () {
                    _checkShowProgressOverlay(me);
                }, delay + 1);
            }
        }
    }

    function _checkShowProgressOverlay(me) {

        if (!!showProgressOverlayAtTime &&
                Date.now() >= showProgressOverlayAtTime && !modalViewVisibleCount &&
                longRunningCount > 0) {
            progressOverlayActive = true;
            _updateProgressOverlay(me);
        }
    }

    function _updateProgressOverlay(me) {

        if (progressOverlayActive) {
            if ($progressOverlay.hasClass(msls_collapsed)) {
                msls_mark(msls_codeMarkers.progressShow);
                $progressOverlay.removeClass(_join(msls_collapsed, msls_overlay_active));
            }

            msls_setTimeout(function () {
                if (progressOverlayActive) {
                    $progressOverlay.addClass(msls_overlay_active);
                }
            }, 1);
        } else {
            if (!$progressOverlay.hasClass(msls_collapsed)) {
                msls_mark(msls_codeMarkers.progressHide);

                $progressOverlay.removeClass(msls_overlay_active);

                msls_setTimeout(function () {
                    if (!progressOverlayActive) {
                        $progressOverlay.addClass(msls_collapsed).removeClass(msls_overlay_active);
                    }
                }, 200);
            }
        }
    }

    function showProgress(promise) {
        var me = this;
        _startPossibleLongRunningOperation(me, 50);
        promise._thenEx(function () {
            _stopPossibleLongRunningOperation(me);
        });
    }


    function _determineButtonsNeeded(navigationUnit) {

        var task = navigationUnit.task,
            isOnFirstScreen = navigationUnit.index === 0,
            result = {};


        if (!navigationUnit.isBrowseMode()) {
            result.showOkCancel = navigationUnit.boundaryOption === msls_BoundaryOption.nested;
            result.showSaveDiscard = !result.showOkCancel;
        } else {
            result.showOk = navigationUnit.boundaryOption === msls_BoundaryOption.nested;
        }

        if (navigationUnit.boundaryOption === msls_BoundaryOption.none) {
            result.showOk = result.showOkCancel = result.showSaveDiscard = false;
        }

        result.showBackClose = !result.showSaveDiscard && !result.showOk && !result.showOkCancel && !isOnFirstScreen;

        if (isOnFirstScreen) {
            result.showLogo = true;
        }

        result.showLogOut = isOnFirstScreen;



        navigationUnit._buttonsNeeded = result;
        return result;
    }


    function _addSharePointChromeInternal($page, navigationUnit) {

        if (!sharePointChromeStylesInitialized && !!msls_sharepoint.chromeBackgroundColor && !!msls_sharepoint.chromeLinkFontColor) {
            sharePointChromeStylesInitialized = true;
            var chromeStyles = "<style> .msls-sharepoint-chrome { background-color: #" + msls_sharepoint.chromeBackgroundColor + "; }\r\n" +
                              " .msls-sharepoint-chrome a.msls-sharepoint-chrome-link, .msls-sharepoint-chrome a.msls-sharepoint-chrome-link:visited," +
                              " .msls-sharepoint-chrome a.msls-sharepoint-chrome-link:hover, .msls-sharepoint-chrome a.msls-sharepoint-chrome-link:active" +
                              "  { color: #" + msls_sharepoint.chromeLinkFontColor + "; } </style>";
            $body.prepend(chromeStyles);
        }

        var $chrome = $("<div class='" + _join(msls_sharePoint_chrome, msls_vauto) + "'></div>");

        var chromeCreationFunction = "createSharePointChrome";
        if (window[chromeCreationFunction] && typeof window[chromeCreationFunction] === "function") {
            window[chromeCreationFunction]($chrome, msls_sharepoint.hostUrl);
        } else {
            var $siteLink = $("<a href='" + msls_sharepoint.hostUrl + "' class='" + msls_sharePoint_chrome_link + "' target='_top'>" +
                              msls_getResourceString("shell_back_to_sharePoint_home_site") +
                              "</a>");
            $siteLink.appendTo($chrome);
        }

        var containerControl = new msls.ui.controls.ContentControl($chrome),
            $header = $("div[data-role='header']", $page);

        containerControl.render();
        $chrome.prependTo($header);
        navigationUnit.registerPageUiControl(containerControl);

        $body.addClass(msls_sharePoint_enabled);
    }



    function _sizeAndCenterDialog(me, pageId) {

        function getAttribute(style, styleName) {

            var value = parseFloat(style[styleName]);
            return value > 0 ? value : 0;
        }

        var page = document.getElementById(pageId),
            frame = page.getElementsByClassName("msls-dialog-frame")[0];

        if (!frame) {
            return;
        }

        var computedFrameStyle = window.getComputedStyle(frame),
            frameStyle = frame.style,
            windowHeight = $(window).height(),
            windowWidth = $(window).width(),
            actualFrameHeight,
            frameStyleChanges = {},
            key;

        var isPhone = getAttribute(computedFrameStyle, "paddingTop") === 0;
        if (isPhone) {
            frameStyleChanges.height = "100%";
            frameStyleChanges.marginTop = 0;
        } else {
            var maxFrameHeight = getAttribute(computedFrameStyle, "maxHeight"),
                desiredHeight = maxFrameHeight > 0 ? Math.min(maxFrameHeight, windowHeight) : windowHeight;

            frameStyleChanges.height = desiredHeight;
            actualFrameHeight = desiredHeight;

            var frameTop = Math.max(0, windowHeight - actualFrameHeight) / 2;
            frameStyleChanges.marginTop = frameTop;
        }

        var maxWidth = getAttribute(computedFrameStyle, "maxWidth"),
            desiredWidth = maxWidth > 0 ? Math.min(maxWidth, windowWidth) : windowWidth;
        frameStyleChanges.width = desiredWidth;
        if (computedFrameStyle.marginLeft !== "auto") {
            var frameLeft = Math.max(0, windowWidth - desiredWidth) / 2;
            frameStyleChanges.marginLeft = frameLeft;
        }

        for (key in frameStyleChanges) {
            var desiredValue = frameStyleChanges[key],
                stringValue = typeof desiredValue === "string" ? desiredValue : desiredValue.toString() + "px";
            if (stringValue !== frameStyle[key]) {
                frameStyle[key] = stringValue;
            }
        }
    }


    function lightSwitchTransitionHandler(transitionName, reverse, $to, $from) {
        var me = msls.shellView,
            deferred = new $.Deferred();

        function onComplete() {
            deferred.resolve();
        }

        switch (transitionName) {
            case msls_screen_transition:
                _transitionScreens(me, transitionName, reverse, $to, $from, onComplete);
                break;

            case msls_dialog_transition:
            case msls_nested_dialog_transition:
                _transitionDialog(me, transitionName, reverse, $to, $from, onComplete);
                break;

            default:
                deferred.reject("Unexpected transition name: " + transitionName);
                break;
        }

        return deferred.promise();
    }

    function _transitionScreens(me, transitionName, reverse, $to, $from, complete) {

        var forward = !reverse;

        msls_suspendLayout();

        _transition(me,
            {
                transitionName: transitionName,
                stage1Delay: forward ? 0 : 167,
                stage3Delay: 167,
                reverse: reverse,
                $ins: $to,
                $outs: $from,
                onStage2: function () {
                    window.scrollTo(0, 0);
                    $to.addClass(ui_page_active);

                    if (forward) {
                        msls_resumeLayout(false);
                        _updateLayoutHelper($to, $to, /*immediate*/ true, /*force*/ true);
                    }

                    return true;
                },
                onCleanup: function () {
                    $from.removeClass(ui_page_active);
                    if (reverse) {
                        msls_resumeLayout(false);
                        _updateLayoutHelper($to, null, /*immediate*/ false, /*force*/ false);
                    }

                    return _syncAfterBrowserInitiatedNavigations(me, $to);
                },
                onComplete: complete
            });
    }

    function _transitionTabs(me, $fromContent, $toContent, $fromFooter, $toFooter, $headerFooter, needsFullLayout, complete) {

        var transitionName = msls_tab_transition,
            $container = $fromContent.parent(),
            fromFooterOuterHeight = needsFullLayout ? 0 : $fromFooter.outerHeight(),
            hasVScroll = $container.hasClass(msls_vscroll);

        if (hasVScroll) {
            $container.removeClass(msls_vscroll);
        }
        _transition(me,
            {
                transitionName: transitionName,
                reverse: false,
                stage1Delay: 167,
                stage3Delay: 167,
                $ins: $().add($toContent).add($toFooter),
                $outs: $().add($fromContent).add($fromFooter),
                onStage2: function () {
                    needsFullLayout = needsFullLayout ||
                        $fromContent.hasClass(msls_vstretch) !== $toContent.hasClass(msls_vstretch) ||
                        fromFooterOuterHeight !== $toFooter.outerHeight();
                    _updateLayoutHelper($toContent, needsFullLayout ? null : $toContent, /*immediate*/ true, /*force*/ needsFullLayout);
                    $headerFooter.each(function () {
                        if ($(this).data("mobile-fixedtoolbar")) {
                            $(this).fixedtoolbar("show");
                        }
                    });
                    return true;
                },
                onStage3: function () {
                    $toContent.addClass(msls_tab_content_active);
                    $toFooter.addClass(msls_footer_content_active);
                },
                onCleanup: function () {
                    $fromContent.removeClass(msls_tab_content_active);
                    $fromFooter.removeClass(msls_footer_content_active);
                    if (hasVScroll) {
                        $container.addClass(msls_vscroll);
                    }
                },
                onComplete: complete
            });
    }

    function _transitionDialog(me, transitionName, reverse, $to, $from, complete) {

        var isFirstDialog,
            forward = !reverse;

        if (transitionName === msls_dialog_transition) {
            isFirstDialog = true;
        } else if (transitionName === msls_nested_dialog_transition) {
            isFirstDialog = false;
            transitionName = msls_dialog_transition;
        }

        msls_suspendLayout();

        _transition(me,
            {
                transitionName: transitionName,
                reverse: reverse,
                stage1Delay: 0,
                stage3Delay: forward ? 167 : 267,
                $ins: $to,
                $outs: $from,
                onStage1: function () {
                    $to.addClass(ui_page_active);
                },
                onStage2: function () {
                    if (forward) {

                        _sizeAndCenterDialog(me, $to[0].id);

                        msls_resumeLayout(false);
                        _updateLayoutHelper($to, $to, /*immediate*/ true, /*force*/ true);
                    }

                    return true;
                },
                onStage3: function () {
                    if (reverse && isFirstDialog) {
                        $dialogOverlay.removeClass(msls_overlay_active);
                    }
                },
                onCleanup: function () {
                    $from.removeClass(ui_page_active);
                    if (reverse) {
                        msls_resumeLayout(false);
                        _updateLayoutHelper($to, null, /*immediate*/ false, /*force*/ false);
                    }
                    return _syncAfterBrowserInitiatedNavigations(me, $to);
                },
                onComplete: complete
            });
    }

    function _transitionOpeningScreen(me, $page, complete) {

        msls_suspendLayout();
        var $ins = $page;
        _transition(me,
            {
                transitionName: msls_opening_transition,
                stage1Delay: 0,
                stage3Delay: 167,
                reverse: false,
                $ins: $ins,
                $outs: $empty,
                onStage1: function () {
                    $ins.css("opacity", "");
                },
                onStage2: function () {
                    msls_resumeLayout(false);
                    _updateLayoutHelper($ins, $ins, /*immediate*/ true, /*force*/ true);

                    $(msls_id_app_loading_selector).remove();
                },
                onCleanup: function () {
                },
                onComplete: complete
            });
    }


    function helper_awaitCallback(action) {
        return WinJS.Promise.join([action ? action() : null]);
    }

    function helper_delay(milliseconds) {
        if (milliseconds === 0) {
            return null;
        }

        var delay = milliseconds;
        msls_mark("StartDelay_" + delay.toString());
        return new WinJS.Promise(function init(c) {
            msls_setTimeout(function () {
                msls_mark("EndDelay_" + delay.toString());
                c();
            }, delay);
        });
    }

    function _transition(me, options) {

        msls_mark(msls_codeMarkers.transitionStart);


        _resetProgressOverlayCounter(me);

        var transitionName = options.transitionName,
            $ins = options.$ins,
            $outs = options.$outs,
            onStage1 = options.onStage1,
            onStage2 = options.onStage2,
            onStage3 = options.onStage3,
            onCleanup = options.onCleanup,
            onComplete = options.onComplete,
            stage1Delay = options.stage1Delay,
            stage3Delay = options.stage3Delay;


        WinJS.Promise.join([
        ])
        .then(function () {
            msls_mark(msls_codeMarkers.transition_Stage1Start);
            return helper_awaitCallback(onStage1);
        })
        .then(function () {
            $outs.addClass(msls_out);
            $ins.addClass(msls_in);

            msls_addOrRemoveClass($body, options.reverse, msls_reverse);
            $body.addClass(transitionName + " " + msls_stage1);

            return helper_delay(stage1Delay);
        })


        .then(function () {
            msls_mark(msls_codeMarkers.transition_Stage2Start);
            _resetProgressOverlayCounter(me);
            $body.removeClass(msls_stage1).addClass(msls_stage2);

            $outs.addClass(msls_layout_ignore);
            $ins.removeClass(msls_layout_ignore);
            return helper_awaitCallback(onStage2);
        })


        .then(function () {
            msls_mark(msls_codeMarkers.transition_Stage3Start);
            _resetProgressOverlayCounter(me);
            return helper_awaitCallback(onStage3);
        })
        .then(function () {
            $body.removeClass(msls_stage2)
                .addClass(msls_stage3);
            return helper_delay(stage3Delay);
        })


        .then(function () {
            msls_mark(msls_codeMarkers.transition_CleanupStart);
            _resetProgressOverlayCounter(me);
            return helper_awaitCallback(onCleanup);
        })
        .then(function () {
            msls_removeClasses($body, transitionName, msls_stage3, msls_reverse);
            msls_removeClasses($outs, msls_out);
            msls_removeClasses($ins, msls_in);
        })


        .then(function () {
            msls_mark(msls_codeMarkers.transitionEnd);
            if (onComplete) {
                onComplete();
            }
        });
    }

    function _updateLayoutHelper($to, $layoutRoot, immediate, force) {

        if (!!$to && $to.length > 0 && !$to[0].msls_attachedLabelUpdated) {
            $to[0].msls_attachedLabelUpdated = true;
            msls_setAttachedLabelWidth($to);
        }
        if (immediate) {
            msls_updateLayoutImmediately($layoutRoot, !force);
        } else {
            msls_updateLayout($layoutRoot, !force);
        }
    }


    function showPopup(rootContentItem, afterClosed, options) {

        var me = this;

        if ($.mobile.popup.active) {
            return WinJS.Promise.wrapError(msls_getResourceString("shell_existingPopup"));
        }

        return new WinJS.Promise(function initShowPopup(complete, error) {
            var $parentPage = $.mobile.activePage,
                $previousActiveElement = $(document.activeElement),
                $popups = $(".msls-popup", $parentPage),
                popupId,
                $popup;

            $.each($popups, function (key, popupElement) {
                if ($(popupElement).attr(data_msls_name) === rootContentItem.name) {
                    $popup = $(popupElement);
                    popupId = popupElement.id;
                    return false;
                }
                return true;
            });

            if (!$popup) {
                msls_mark(msls_codeMarkers.createPopupStart);
                popupId = _createUniquePageId(me, "popup-");
                $popup = _createPopup(me, popupId, $parentPage, rootContentItem);

                msls_mark(msls_codeMarkers.createPopupEnhance);

                $popup.trigger("create");

                msls_mark(msls_codeMarkers.createPopupEnd);
            } else {
                $popup.removeClass(msls_collapsed);
            }

            msls_mark(msls_codeMarkers.openPopupStart);
            msls_suspendLayout();

            function private_unexpectedPopupId(evt) {
                if (evt.target.id !== popupId) {
                    return true;
                }
                return false;
            }

            $(window).one("popupbeforeposition", function (evt) {
                if (private_unexpectedPopupId(evt)) {
                    return;
                }
                msls_resumeLayout(false);
                _updateLayoutHelper($popup, null, true, true);
            });

            $(window).one("popupafteropen", function (evt) {
                if (private_unexpectedPopupId(evt)) {
                    return;
                }
                complete();
                msls_handleDialogFocus($popup.parent());
                msls_mark(msls_codeMarkers.openPopupEnd);
            });

            $popup.one("popupafterclose", function (evt) {
                if (private_unexpectedPopupId(evt)) {
                    return;
                }
                $popup.addClass(msls_collapsed);
                me.commitActiveElement();

                $previousActiveElement.focus();
                afterClosed();
                msls_mark(msls_codeMarkers.closePopupEnd);
            });

            $popup.popup();


            var popupOptions = {};

            if (options && options.originalEvent) {
                var originalEvent = options.originalEvent;
                popupOptions.x = originalEvent.pageX;
                popupOptions.y = originalEvent.pageY;
                $popup[0]._mslsCustomPosition = { x: originalEvent.pageX, y: originalEvent.pageY };
            } else {
                $popup[0]._mslsCustomPosition = null;
            }
            $popup.popup("open", popupOptions);
        });
    }

    function closePopup() {
        var activePopup = $.mobile.popup.active;

        if (activePopup) {
            return new WinJS.Promise(function initPopupClose(complete) {
                $(window).one("popupafterclose", function (evt) {
                    msls_dispatch(complete);
                });
                activePopup.close();
            });
        } else {
            return WinJS.Promise.as();
        }
    }

    function commitActiveElement() {

        var activeElement = document.activeElement,
            $activeElement;

        if (activeElement) {
            $activeElement = $(activeElement);
            if ((activeElement.tagName === "INPUT" && !!$activeElement.closest(".msls-ctl-text-box").length) ||
                (activeElement.tagName === "TEXTAREA" && !!$activeElement.closest(".msls-ctl-text-area").length)) {
                $(activeElement).trigger("change");
            }
        }
    }


    function _join() {
        return Array.prototype.join.call(arguments, " ");
    }

    function _createFromCache(cacheContainer, key, createItemFunction) {

        var temporaryContainer = document.createElement("div"),
            templateData,
            $element;

        var cachedTemplate = cacheContainer[key];
        if (cachedTemplate) {
            templateData = cachedTemplate.templateData;
            temporaryContainer.innerHTML = cachedTemplate.html;
            $element = $(temporaryContainer.firstChild);
        } else {
            templateData = {};
            cachedTemplate = { templateData: templateData };
            cacheContainer[key] = cachedTemplate;

            msls_mark(msls_codeMarkers.createTemplateStart);
            $element = createItemFunction(templateData);
            msls_mark(msls_codeMarkers.createTemplateEnd);

            $element.appendTo($(temporaryContainer));
            cachedTemplate.html = temporaryContainer.innerHTML;
        }
        $element.detach();

        return { $element: $element, templateData: templateData };
    }


    msls_defineClass(msls, "ShellView",
        function ShellView() {

            this._pageIdMapping = {};
            msls_setProperty(this, "_pageIdToIndexMapping", {});

        }, null, {
            _nextPageId: 1,
            _firstPageId: null,
            _initializeMobileOnce: true,
            initialize: initialize,
            navigate: navigate,
            awaitBrowserNavigation: awaitBrowserNavigation,
            onNavigationUnitClosed: onNavigationUnitClosed,
            logout: logout,
            showProgress: showProgress,
            showPopup: showPopup,
            closePopup: closePopup,
            commitActiveElement: commitActiveElement
        }
    );

    msls_shellView = new msls.ShellView();
    msls_setProperty(msls, "shellView", msls_shellView);

    msls_setProperty(msls.shell, "shellView", msls_shellView);

}());

(function () {

    var _Text = msls.ui.controls.Text,
        inUpdatingView;

    function Summary(view) {

        var me = this;
        _Text.call(me, view);
    }

    function _refreshView() {
        if (!inUpdatingView) {
            var entity = this.entity,
                value = null;
            if (!!entity && !!this.valuePropertyName) {
                value = entity[this.valuePropertyName];
            }
            _updateText(this, value);
        }
    }

    function _updateText(me, value) {

        inUpdatingView = true;
        try {
            var stringValue,
                textElement = me._textElement;

            if (me._isViewCreated && !!textElement) {

                stringValue = _getStringValue(me, value);

                textElement.text(me.text = stringValue);
            }
        }
        finally {
            inUpdatingView = false;
        }
    }

    function _initView(me) {
        var entity = me.entity,
            entityType,
            summaryAttribute,
            property = null,
            contentItem;

        if (!!entity && !me.valueProperty) {

            entityType = entity.details.getModel();

            summaryAttribute = msls_getAttribute(entityType, ":@SummaryProperty");
            if (!!summaryAttribute) {
                property = summaryAttribute.property;
            }


            if (property) {
                me.valueProperty = property;
                me.valuePropertyName = msls_getProgrammaticName(property.name);

                contentItem = me.data;
                contentItem.dataBind("value." + me.valuePropertyName, function (newValue) {
                    _updateText(me, newValue);
                });
            }
        }
    }

    function _getStringValue(me, value) {

        var supportedValues,
            valuePair,
            stringValue = "";

        if (me.valueProperty) {
            supportedValues = msls_getAttributes(me.valueProperty, ":@SupportedValue");

            if (!!supportedValues) {
                valuePair = msls_iterate(supportedValues)
                    .first(function (sv) { return sv.value === value; });
                if (!!valuePair) {
                    stringValue = msls_getLocalizedString(valuePair.displayName);
                }
            }
            if (!valuePair) {
                stringValue = msls_convertToString(value, me.valueProperty);
            }
        }

        return stringValue;
    }

    msls_defineClass("ui.controls", "Summary", Summary, _Text, {
        controlName: "Summary",
        entity: msls_controlProperty(
            function onEntityChanged(value) {
                _initView(this);
            }),
        valueProperty: null,
        valuePropertyName: null,
        _refreshView: _refreshView
    }, {
        _fillTemplate: _Text._fillTemplate,
        _skipEnhance: true
    });

    msls.ui.controls.Summary.prototype._propertyMappings = {
        value: "entity",
        properties: { tap: "tap" }
    };
}());

(function () {
    var
    msls_builtIn_showHeaderProperty =
        msls_getControlPropertyId("ShowHeader", "RootCollectionControl"),
    itemHtmlSelector = "tr.msls-tr",
    itemDataKey = "__entity",
    tableTemplate =
        "<div class='msls-vauto " + msls_control_header + "'/>" +
        "<div{0}>" +
        "<table class='msls-table ui-responsive table-stripe' " +
            "data-role='table' data-inset='true' role='grid'>" +
          "<thead role='rowgroup'></thead>" +
          "<tbody role='rowgroup'></tbody>" +
        "</table></div>",
    tableEmptyHtml,
    initializedNotification = "tableInitialized",
    loadingNotification = "tableLoading",
    itemsAddedNotification = "tableItemsAdded",
    fixedSizingMode = msls_WidthSizingMode.fixedSize,
    minWidthProperty = msls_getControlPropertyId("MinWidth"),
    maxWidthProperty = msls_getControlPropertyId("MaxWidth"),
    weightedColumnWidthProperty = msls_getControlPropertyId("WeightedColumnWidth", "ColumnsLayout"),
    contentItemService = msls.services.contentItemService,
    _ContentItemPresenter = msls.ui.controls.ContentItemPresenter,
    _VisualCollectionState = msls.VisualCollection.State;

    function needReLayout(contentItem) {

        var i, child, widthSizingModeValue, stretchCount = 0,
            childCount = contentItem.children.length,
            controlModel = contentItem.controlModel;

        if (contentItem._isHStretch) {
            for (i = 0; i < childCount; i++) {
                child = contentItem.children[i];
                widthSizingModeValue = child.properties[msls_builtIn_widthSizingModeProperty];

                if (child._isHStretch) {
                    stretchCount++;
                }
            }

            if (stretchCount > 0 && stretchCount < childCount) {
                return true;
            }
        }
        return false;
    }

    function updateSelection(table, trElement) {


        var
        collection = table._collection,
        entity;

        table._selectingElement = trElement;

        entity = trElement.data(itemDataKey);
        collection.selectedItem = entity;

        table._selectingElement = null;

        msls_mark(msls_codeMarkers.tableSelectedItemChanged);
    }

    function addItemEventHandlers(table) {

        var tbodyElement = table._tbodyElement,
            tbodyHtmlElement = tbodyElement[0];

        msls_bind_clickEvent(tbodyElement,
           table,
           "itemTap",
           "ItemTapPromise",
           function filterEvent(e) {
               return $(e.target).closest(itemHtmlSelector).length;
           }
        );

        tbodyElement.keypress(function (e) {
            if (e.keyCode === $.mobile.keyCode.ENTER) {
                $(e.target).trigger("vclick");
            }
        });
    }

    function endLoading(table) {
        msls_mark(msls_codeMarkers.tableLoadEnd);
        updateTableEmpty(table);
        notifyLoading(table, false);
    }

    function loadMoreEntities(table) {
        var collection = table._collection,
            itemsCount = table.data.children.length - 1,
            collectionData = collection.data;

        if (itemsCount < collectionData.length) {

            notifyLoading(table, true);
            addTableItems(table, collectionData.slice(
                itemsCount, itemsCount + collection._loader._pageSize));

        } else if (collection.canLoadMore) {
            msls_mark(msls_codeMarkers.tableLoadLoadMore);
            collection.loadMore(true);

        } else {
            endLoading(table);
        }
    }

    function tryLoadMoreEntities(table) {
        var collection = table._collection;

        if (!collection) {
            return;
        }

        if (collection.state === _VisualCollectionState.idle) {
            var scrollHelper = table._scrollHelper,
                needMoreItems =
                    table.data._isActivated &&
                    table._tableElement.height() - scrollHelper.viewTop <
                        2 * scrollHelper.viewHeight;

            if (needMoreItems) {
                loadMoreEntities(table);
            } else {
                endLoading(table);
            }
        }
    }

    function updateTableEmpty(table) {

        var tableElement = table._tableElement,
            emptyElement = tableElement.next("." + msls_table_empty);

        if (table.data.children.length === 1) {
            if (!tableEmptyHtml) {
                tableEmptyHtml = "<div class='" + msls_table_empty + "'>" +
                    msls_getResourceString("listView_no_items") + "</div>";
            }
            if (!emptyElement.length) {
                tableElement.after(tableEmptyHtml);
            }
            table.focusableItem = $();
        } else {
            emptyElement.remove();
            if (table.focusableItem.length === 0) {
                table.focusableItem = table.getItems().first();
            }
        }
    }

    function needEnhancement(contentItem) {
        var controlId,
            controlClass;

        if (msls_isGroupControl(contentItem.controlModel)) {
            return msls_iterate(contentItem.children).any(needEnhancement);
        }

        controlId = msls_getControlId(contentItem);
        if (controlId) {
            controlClass = msls_controlMappings[controlId];
            if ($.isFunction(controlClass)) {
                return !controlClass._skipEnhance;
            }
        }
        return true;
    }

    function refreshTable(table) {

        var labels = [];

        var i = 0,
            j = 0,
            th = table.find("thead th");
        for (i = 0; i < th.length; i++) {
            labels.push($("<b class='ui-table-cell-label'>" +
                th[i].innerHTML + "</b>"));
        }

        var rows = table.find("tbody > tr"),
            rowLength = rows.length,
            labelLength = labels.length;
        for (i = 0; i < rowLength; i++) {
            var cells = $(rows[i].children),
                cellLength = cells.length;
            if (cells.first().children("b.ui-table-cell-label").length === 0) {
                for (j = 0; j < cellLength && j < labelLength; j++) {
                    cells.eq(j).prepend(labels[j].clone());
                }
            }
        }
    }

    function addTableItems(table, items, startingIndex, skipTryLoadMore) {

        var
        index, lastIndex = items.length - 1,
        tableElement = table._tableElement,
        tableContentItem = table.data,
        rowTemplateContentItem = tableContentItem.children[0],
        prependElements = startingIndex === 0 && tableElement.find(itemHtmlSelector).length !== 0,
        contentItemPresenterView,
        rowElement,
        theme,
        rowTemplate = table._rowTemplate,
        rowTemplateData = table._rowTemplateData,
        tr,
        contentItemPresenterControl,
        emptyElement = $(".msls-empty", tableElement),
        addedElements = [],
        addedContentItems = [],
        addedElementsContainer,
        tbodyNode = tableElement.find("tbody")[0],
        insertPosition,
        $elements;


        if (!rowTemplateContentItem) {
            return;
        }

        if (lastIndex >= 0) {

            if (!rowTemplate) {
                rowTemplateData = table._rowTemplateData = {};
                rowTemplate = table._rowTemplate = window.document.createElement("tr");
                tr = $(rowTemplate);

                contentItemPresenterView = tr;
                tr.attr("tabIndex", "-1");

                tr.attr("data-icon", "false");

                theme = $.mobile.getInheritedTheme(tableElement, cssDefaultJqmTheme);
                tr.addClass("msls-tr msls-style ui-shadow ui-tr");

                msls_createPresenterTemplate(contentItemPresenterView, rowTemplateContentItem, rowTemplateData);
                table._itemHasAttachedLabel = !!tr.find("." + msls_attached_label).length;

                table._shouldEnhance = needEnhancement(rowTemplateContentItem);
            }


            addedElementsContainer = document.createDocumentFragment();
            for (index = 0; index <= lastIndex; index++) {
                addedContentItems.push(contentItemService.cloneContentItemTree(rowTemplateContentItem, tableContentItem, items[index]));

                rowElement = rowTemplate.cloneNode(true);
                addedElements.push(rowElement);
                addedElementsContainer.appendChild(rowElement);
            }

            insertPosition = (prependElements ? tbodyNode.firstChild : (emptyElement.length > 0 ? emptyElement[0] : null));
            if (!!insertPosition) {
                tbodyNode.insertBefore(addedElementsContainer, insertPosition);
            } else {
                tbodyNode.appendChild(addedElementsContainer);
            }

            for (index = 0; index <= lastIndex; index++) {
                tr = $(rowElement = addedElements[index]);
                tr.data(itemDataKey, items[index]);

                contentItemPresenterView = $(rowElement);

                contentItemPresenterControl = new _ContentItemPresenter(contentItemPresenterView);
                contentItemPresenterControl.parent = table;
                contentItemPresenterControl.data = addedContentItems[index];
                contentItemPresenterControl.attachView(rowTemplateData);
            }

            $elements = $(addedElements);
            msls_mark(msls_codeMarkers.tableLoadEnhanceView);
            if (table._shouldEnhance) {
                $elements.trigger("create");
            }
            refreshTable(tableElement);

            msls_notify(itemsAddedNotification, table);
        }

        msls_mark(msls_codeMarkers.tableLoadApplyEnd);

        function onLayoutUpdated() {
            msls_unsubscribe(msls_layout_updatedNotification, onLayoutUpdated);
            msls_dispatch(function () {
                tryLoadMoreEntities(table);
            });
        }
        if (!skipTryLoadMore) {
            if (lastIndex >= 0) {
                msls_subscribe(msls_layout_updatedNotification, onLayoutUpdated);
            } else {
                msls_dispatch(function () {
                    tryLoadMoreEntities(table);
                });
            }
        }
        updateTableEmpty(table);

        if (addedElements.length > 0) {
            if (table._itemHasAttachedLabel) {
                msls_setAttachedLabelWidth($elements);
            }
            msls_updateLayout($elements, true);
            if (msls_verticalScrollbarSize && !tableContentItem._isVStretch) {
                msls_updateLayout();

                msls_notify("LayoutUpdateIgnoreNotification");
            }
        }
    }

    function removeTableItems(table, items) {

        if (!items || items.length === 0) {
            return;
        }

        var
            itemsToSearch = items.slice(0),
            childContentItems = table.data.children,
            i, len,
            childIndex,
            removingIndices = [],
            childContentItem,
            childContentItemView;

        for (i = 1, len = childContentItems.length; i < len; i++) {
            childIndex = itemsToSearch.indexOf(
                childContentItems[i].data);
            if (childIndex > -1) {
                removingIndices.push(i);
                itemsToSearch.splice(childIndex, 1);
            }
            if (itemsToSearch.length === 0) {
                break;
            }
        }

        for (i = removingIndices.length - 1; i >= 0; i--) {
            childIndex = removingIndices[i];
            childContentItem = childContentItems[childIndex];

            childContentItems.splice(childIndex, 1);

            childContentItemView = childContentItem._view;

            var $item = childContentItemView.getView(),
                $toFocus;
            if ($item.attr(html_tabIndex_Attribute) === "0") {
                $toFocus = $item.next(itemHtmlSelector);
                if (!$toFocus.length) {
                    $toFocus = $item.prev(itemHtmlSelector);
                }
                table.focusableItem = $toFocus;
            }

            $item.remove();

            childContentItemView.parent = null;
            msls_dispose(childContentItemView);
            msls_dispose(childContentItem);
        }

        updateTableEmpty(table);
    }

    function onCollectionChange(table, e) {

        if (table._collectionPromise) {
            return;
        }

        var action = e.action,
            items = e.items;


        if (action === msls_CollectionChangeAction.add) {
            addTableItems(table, items, e.newStartingIndex, true);
        } else if (e.action === msls_CollectionChangeAction.remove) {
            removeTableItems(table, items);
        }
    }

    function notifyLoading(table, isLoading) {
        msls_notify(loadingNotification, {
            table: table,
            isLoading: isLoading
        });
    }

    function onVisualCollectionExecutionResolved(table, items, startIndex) {
        if (!table._collection) {
            return;
        }

        table._collectionPromise = null;
        msls_mark(msls_codeMarkers.tableLoadDataLoaded);
        addTableItems(table, items, startIndex);
    }

    function joinVisualCollectionExecution(table) {

        var visualCollection = table._collection,
            collectionState = visualCollection.state,
            tableElement = table._tableElement;

        tableElement.next("." + msls_table_empty).remove();

        notifyLoading(table, true);

        if (collectionState === _VisualCollectionState.loading) {
            (table._collectionPromise = visualCollection.load(true)).then(
                function success(count) {
                    onVisualCollectionExecutionResolved(table, visualCollection.data);
                },
                function failure(error) {
                }
            );
        } else {
            (table._collectionPromise = visualCollection.loadMore(true)).then(
                function success(result) {
                    onVisualCollectionExecutionResolved(
                        table, result.items, result.startIndex);
                },
                function failure(error) {
                }
            );
        }
    }

    function deleteChildContentItems(table) {
        var children = table.data.children,
            index,
            childContentItem;
        for (index = children.length - 1; index >= 1; index--) {
            childContentItem = children[index];
            msls_dispose(childContentItem._view);
            msls_dispose(childContentItem);
        }
        children.length = 1;
    }

    function onCollectionStateChange(table) {

        var collectionState = table._collection.state;
        if (collectionState !== _VisualCollectionState.idle) {

            if (collectionState === _VisualCollectionState.loading) {
                table._tbodyElement.children(itemHtmlSelector).remove();
                deleteChildContentItems(table);
            }
            joinVisualCollectionExecution(table);
        }
    }

    function onCollectionSelectedItemChange(table) {

        var tbodyElement = table._tbodyElement,
            selectedItem = table._collection.selectedItem,
            selectingElement,
            element;

        if (table._collectionPromise) {
            return;
        }

        if (selectedItem) {
            selectingElement = table._selectingElement;
            table._selectingElement = null;

            if (!selectingElement) {
                tbodyElement.children(itemHtmlSelector).each(function () {
                    element = $(this);
                    if (element.data(itemDataKey) === selectedItem) {
                        selectingElement = element;
                        return false;
                    }
                    return true;
                });
            }

        }

        if (!selectingElement ||
            !selectingElement.hasClass(ui_btn_active)) {
            tbodyElement.find(itemHtmlSelector + "." + ui_btn_active).removeClass(ui_btn_active);

            if (selectingElement) {
                selectingElement.addClass(ui_btn_active);
                table.focusableItem = selectingElement;
                table.focusCurrentItem();
            }
        }
    }

    function updateLoadingIndicator(table) {

        var collection = table._collection,
            isIdle = collection.state === _VisualCollectionState.idle;

        if (!!collection.loadError || (isIdle && !collection.canLoadMore)) {
            if (table._loadingIndicator) {
                table._loadingIndicator.remove();
                table._loadingIndicator = null;
            }
        } else {
            if (!table._loadingIndicator) {
                table._loadingIndicator = $("<div class='" + msls_table_loading + "'></div>").insertAfter(table._tableElement);
            }
        }
    }

    function onCreated(table) {
        var collection = table._collection,
            scrollHelper,
            isIdle;

        if (!collection) {
            return;
        }


        msls_addAutoDisposeEventListener(collection, "collectionchange", table, function (e) {
            onCollectionChange(table, e.detail);
        });
        updateLoadingIndicator(table);

        msls_addAutoDisposeChangeListener(collection, "state", table, function () {
            onCollectionStateChange(table);
            updateLoadingIndicator(table);
        });
        msls_addAutoDisposeChangeListener(collection, "loadError", table, function () {
            updateLoadingIndicator(table);
        });

        msls_addAutoDisposeChangeListener(collection, "selectedItem", table, function () {
            onCollectionSelectedItemChange(table);
        });

        msls_mark(msls_codeMarkers.tableLoadStart);

        scrollHelper = table._scrollHelper =
            new msls.ui.controls.ScrollHelper(table._tableElement, table.data);
        scrollHelper.addEventListener("scroll", function () {
            if (msls_shell._currentNavigationOperation) {
                return;
            }
            
            tryLoadMoreEntities(table);
        });

        table.keyboardDispatcher =
            msls_ui_CollectionControl.keyBindListNavigation(
            table);

        if (collection.state !== _VisualCollectionState.idle) {
            joinVisualCollectionExecution(table);

        } else {
            msls_setTimeout(function () {
                loadMoreEntities(table);
            }, 1);
        }

        table._onWindowResize = function () {
            tryLoadMoreEntities(table);
        };
        $(window).on("resize", table._onWindowResize);
    }

    msls_defineClass("ui.controls", "Table", function Table(view) {
        msls_ui_CollectionControl.call(this, view);
        this._itemHtmlSelector = itemHtmlSelector;
    }, msls_ui_CollectionControl, {
        controlName: "Table",
        itemTap: msls_controlProperty(),

        getItems: function getItems() {
            return this._tbodyElement.children();
        },

        _attachViewCore: function (templateData) {

            var table = this,
                tableElement = table._tableElement =
                    msls_control_find(table.getView(), "table"),
                tbodyElement = table._tbodyElement =
                    msls_control_find(table.getView(), "tbody"),
                contentItem = table.data,
                rowTemplateContentItem =
                    contentItem.children[0],
                collection = table._collection =
                    contentItem.value,
                screenModel,
                controlModel = contentItem.controlModel;

            screenModel = contentItem.screen.details.getModel();

            if (!table._headerLabel) {
                table._headerLabel = new msls.ui.controls.Text(
                    $("." + msls_control_header, table.getView()));

                var isVisible = contentItem.properties[msls_builtIn_showHeaderProperty];
                msls_addOrRemoveClass(table._headerLabel.getView(), !isVisible, msls_collapsed);

                var headerTextBinding = new msls.data.DataBinding(
                    "data.displayName", table, "text", table._headerLabel,
                    msls_data_DataBindingMode.oneWayFromSource);
                headerTextBinding.bind();
            }
            table._headerLabel.render();

            if (!collection) {
                return;
            }

            addItemEventHandlers(table);

            function onLayoutUpdated() {
                msls_unsubscribe(msls_layout_updatedNotification, onLayoutUpdated);
                msls_dispatch(function () {
                    onCreated(table);
                });
            }

            msls_subscribe(msls_layout_updatedNotification, onLayoutUpdated);

            msls_notify(initializedNotification, table);
            msls_ui_Control.prototype._attachViewCore.call(table, templateData);
        },

        _customVisualStateHandler:
            function _customVisualStateHandler(e) {
                if (e.state === msls_VisualState.loading) {
                    e.custom = true;
                }
            },

        _onBeforeTap: function onBeforeTap(e) {
                msls_mark(msls_codeMarkers.tableItemClicked);

                var tbodyElement = this._tbodyElement,
                    tbodyHtmlElement = tbodyElement[0],
                    element =  e.target,
                    elementParent = element.parentNode;

                if (window.getSelection) { // Not implemented in IE < 9
                    if (window.getSelection().toString().length > 0) {
                        return false;
                    }
                }

                if (element !== tbodyHtmlElement) {
                    while (elementParent !== tbodyHtmlElement) {
                        element = elementParent;
                        elementParent = element.parentNode;
                    }
                    if ($(element).hasClass("msls-tr")) {
                        updateSelection(this, $(element));
                    }
                }

                return true;
            },

        _onDispose:
            function _onDispose() {
                var me = this,
                    headerLabel = me._headerLabel,
                    globalStyle = me._globalStyle;

                if (headerLabel) {
                    msls_dispose(headerLabel);
                    me._headerLabel = null;
                }
                if (globalStyle) {
                    globalStyle.remove();
                    me._globalStyle = null;
                }

                msls_dispose(me._scrollHelper);

                me.itemTap = null;
                me._tableElement = null;
                me._tbodyElement = null;
                me._collection = null;
                me._scrollHelper = null;

                $(window).off("resize", me._onWindowResize);
                me._onWindowResize = null;

                deleteChildContentItems(me);
            }
    }, {
        _fillTemplate:
            function _fillTemplate(view, contentItem, templateData) {


                var tableContainerClass = " class='",
                    rowTemplateContentItem = contentItem.children[0];

                if (contentItem._isHStretch) {
                    tableContainerClass += " msls-hstretch";
                } else {
                    tableContainerClass += " msls-hauto";
                }
                if (contentItem._isVStretch) {
                    tableContainerClass += " msls-vstretch msls-vscroll";
                } else {
                    tableContainerClass += " msls-vauto";
                }
                if (!needReLayout(rowTemplateContentItem)) {
                    tableContainerClass += " " + msls_layout_ignore_children;
                }
                tableContainerClass += "'";
                $(msls_stringFormat(tableTemplate, tableContainerClass))
                    .appendTo(view);
                view.addClass(msls_rows_layout);

                if (contentItem._isHStretch) {
                    view.find("table").addClass("msls-hstretch");
                }

                var headRow = $("<tr>"),
                    columns = contentItem.children[0].children,
                    i,
                    len = columns.length,
                    netWeight = getNetCollectionWeight(columns);
                for (i = 0; i < len; i++) {
                    if (columns[i].isVisible) {
                        headRow.append(fillHeader($("<th>"), columns[i], netWeight));
                    }
                }
                headRow.appendTo(view.find("thead"));
            },
    });

    function getNetCollectionWeight(columns) {
        var i,
            item,
            len = columns.length,
            totalWeight = 0,
            stretchColumnCount = 0;

        for (i = 0; i < len; i++) {
            item = columns[i];
            if (item.widthSizingMode !== fixedSizingMode) {
                totalWeight += item.properties[weightedColumnWidthProperty];
            }
            stretchColumnCount += item._isHStretch ? 1 : 0;
        }

        return stretchColumnCount > 0 ? totalWeight : 0;
    }

    function fillHeader($view, item, totalWeight) {
        $view.html(item.displayName);
        var properties = item.properties,
            percent;
        if (item.widthSizingMode === fixedSizingMode) {
            $view.css("width", properties[msls_builtIn_widthProperty] + "px");
        } else if (totalWeight > 0) {
            percent = (100 * properties[weightedColumnWidthProperty]) / totalWeight;
            $view.css("width", percent + "%");
        }
        if (properties[minWidthProperty]) {
            $view.css("min-width", properties[minWidthProperty] + "px");
        }
        if (properties[maxWidthProperty]) {
            $view.css("max-width", properties[maxWidthProperty] + "px");
        }
        return $view;
    }

    msls.ui.controls.Table.prototype._propertyMappings = {
        properties: { itemTap: "itemTap" },
    };
}());

(function () {
    function WebAddressEditor(view) {

        msls.ui.controls.TextBox.call(this, view);
    }

    function _fillTemplate(view, contentItem, templateData) {
        var template = '<input type="url" class="id-element" data-mini="true" />';

        $(template).appendTo(view);
        templateData.idElement = msls_getTemplateItemPath(view, msls_control_find(view, ".id-element"));
    }

    msls_defineClass("ui.controls", "WebAddressEditor", WebAddressEditor, msls.ui.controls.TextBox, {
        controlName: "WebAddressEditor"
    }, {
        _fillTemplate: _fillTemplate,
        _isFormElement: true
    });

    msls.ui.controls.WebAddressEditor.prototype._propertyMappings = {
        stringValue: "text",
        maxLength: "maxLength",
        properties: {
            placeholderText: "placeholderText"
        }
    };
}());

(function () {
    function WebAddressViewer(view) {

        msls.ui.controls.Text.call(this, view);
    }

    function _refreshView() {
        var displayText = this.text,
            linkValue = this.text,
            textElement = this._textElement;

        if (this._isViewCreated && typeof displayText === "string") {

            var match = displayText.match(/(.*?[^,]), (.+)/);
            if (match) {
                displayText = match[2];
                linkValue = match[1];
            }

            textElement.text(displayText);

            linkValue = $.trim(linkValue);
            match = linkValue.match(/^https?:\/\/(.+)/i);
            if (!match) {
                linkValue = "http://" + linkValue;
            }

            textElement.removeAttr("href");
            textElement.removeClass("ui-link");

            try {
                var link = document.createElement("a");
                link.href = linkValue;

                match = link.href.match(/^(https?:\/\/.+?)\/(.*)/i);
                if (!link.href.match(/^https?:\/\/\//i) &&
                    (link.href.toLowerCase() === linkValue.toLowerCase() ||
                    !!match && (match[1] + match[2]).toLowerCase() === linkValue.toLowerCase())) {
                    textElement.attr("href", link.href);
                    textElement.addClass("ui-link");
                }
            } catch (e) {
            }
        }
    }

    function _fillTemplate(view, contentItem, templateData) {
        $('<div class="msls-text"><a class="id-element" target="_blank"></a></div>')
            .appendTo(view);
        templateData.idElement = msls_getTemplateItemPath(view, msls_control_find(view, ".id-element"));
    }

    msls_defineClass("ui.controls", "WebAddressViewer", WebAddressViewer, msls.ui.controls.Text, {
        controlName: "WebAddressViewer",

        _refreshView: _refreshView
    }, {
        _fillTemplate: _fillTemplate
    });

}());

(function () {
    var _DataBindingMode = msls.data.DataBindingMode;

    var msls_createControlMappings =
        function createControlMappings(controlName, controlClass) {

            function initControlPropertyBindings(control, mappings, valueSource, additionalPath) {
                var sourceProperty,
                    targetProperty,
                    binding;

                for (sourceProperty in mappings) {
                    additionalPath.push(sourceProperty);
                    targetProperty = mappings[sourceProperty];
                    if (typeof targetProperty === "string") {
                        binding = new msls.data.DataBinding(additionalPath.join("."), valueSource, targetProperty, control, msls_data_DataBindingMode.oneWayFromSource);
                        binding.bind();
                    } else {
                        initControlPropertyBindings(control, targetProperty, valueSource, additionalPath);
                    }
                    additionalPath.pop();
                }
            }

            function initControlProperties(control, mappings, valueSource) {
                var sourceProperty,
                    targetProperty;

                for (sourceProperty in mappings) {
                    targetProperty = mappings[sourceProperty];
                    if (typeof targetProperty === "string") {
                        control[targetProperty] = msls_getLocalizedString(valueSource[sourceProperty]);
                    } else if (sourceProperty === "properties") {
                        initControlProperties(control, targetProperty, valueSource[sourceProperty]);
                    } else {
                        initControlPropertyBindings(control, targetProperty, valueSource, [sourceProperty]);
                    }
                }
            }

            function bindEditableProperties(control, editableProperties, contentItem) {
                var sourceProperty,
                    targetProperty,
                    binding;

                for (sourceProperty in editableProperties) {
                    targetProperty = editableProperties[sourceProperty];
                    binding = new msls.data.DataBinding(targetProperty, contentItem, sourceProperty, control);
                    binding.bind();
                }
            }

            if (controlClass) {
                msls_controlMappings[controlName] = controlClass;
            }

            msls_layoutControlMappings[controlName] =
            function render(view, contentItem, templateData) {

                var screenClass = contentItem.screen.constructor,
                    control,
                    _Constructor = controlClass,
                    propertyMappings,
                    editableProperties,
                    postRenderMethod;

                control = new _Constructor(view);
                control.data = contentItem;

                propertyMappings = control._propertyMappings;
                if (!!propertyMappings) {
                    initControlProperties(control, propertyMappings, contentItem);
                }
                editableProperties = control._editableProperties;
                if (!!editableProperties) {
                    bindEditableProperties(control, editableProperties, contentItem);
                }

                if (templateData !== undefined) {
                    control.attachView(templateData);
                } else {
                    control.render();
                }

                postRenderMethod = screenClass[contentItem.name + "_postRender"];
                if (!!postRenderMethod) {
                    try {
                        postRenderMethod.call(null, view[0], contentItem);
                    } catch (ex) {
                        contentItem.displayError = msls_getResourceString("customControl_postRenderError_2args", contentItem.name, ex);
                    }
                }

                return control;
            };

        };

    msls_createControlMappings("DateTimePicker", msls.ui.controls.DateTimePicker);
    msls_createControlMappings("DatePicker", msls.ui.controls.DatePicker);
    msls_createControlMappings("Control", msls.ui.Control);
    msls_createControlMappings("TextBox", msls.ui.controls.TextBox);
    msls_createControlMappings("Text", msls.ui.controls.Text);
    msls_createControlMappings("TextArea", msls.ui.controls.TextArea);
    msls_createControlMappings("RowsLayout", msls.ui.controls.RowsLayout);
    msls_createControlMappings("ColumnsLayout", msls.ui.controls.ColumnsLayout);
    msls_createControlMappings("TableRowLayout", msls.ui.controls.TableRowLayout);
    msls_createControlMappings("List", msls.ui.controls.ListView);
    msls_createControlMappings("TileList", msls.ui.controls.ListView);
    msls_createControlMappings("Table", msls.ui.controls.Table);
    msls_createControlMappings("Button", msls.ui.controls.Button);
    msls_createControlMappings("CommandBarButton", msls.ui.controls.CommandBarButton);
    msls_createControlMappings("Summary", msls.ui.controls.Summary);
    msls_createControlMappings("MoneyViewer", msls.ui.controls.MoneyViewer);
    msls_createControlMappings("MoneyEditor", msls.ui.controls.MoneyEditor);
    msls_createControlMappings("PercentViewer", msls.ui.controls.PercentViewer);
    msls_createControlMappings("PercentEditor", msls.ui.controls.PercentEditor);
    msls_createControlMappings("PhoneNumberViewer", msls.ui.controls.PhoneNumberViewer);
    msls_createControlMappings("PhoneNumberEditor", msls.ui.controls.PhoneNumberEditor);
    msls_createControlMappings("EmailAddressEditor", msls.ui.controls.EmailAddressEditor);
    msls_createControlMappings("EmailAddressViewer", msls.ui.controls.EmailAddressViewer);
    msls_createControlMappings("DocumentEditor", msls.ui.controls.DocumentEditor);
    msls_createControlMappings("DocumentViewer", msls.ui.controls.DocumentViewer);
    msls_createControlMappings("FlipSwitchControl", msls.ui.controls.FlipSwitchControl);
    msls_createControlMappings("WebAddressEditor", msls.ui.controls.WebAddressEditor);
    msls_createControlMappings("WebAddressViewer", msls.ui.controls.WebAddressViewer);
    msls_createControlMappings("Image", msls.ui.controls.Image);
    msls_createControlMappings("ValueDropdown", msls.ui.controls.Dropdown);
    msls_createControlMappings("DetailsModalPicker", msls.ui.controls.ModalPicker);
    msls_createControlMappings("Paragraph", msls.ui.controls.Paragraph);
    msls_createControlMappings("ValueCustomControl", msls.ui.controls.CustomControl);
    msls_createControlMappings("GroupCustomControl", msls.ui.controls.CustomControl);
    msls_createControlMappings("CollectionCustomControl", msls.ui.controls.CustomControl);
    msls_createControlMappings("ScreenCustomControl", msls.ui.controls.CustomControl);
    msls_createControlMappings("NoControl", msls.ui.controls.NoControl);

}());

if (!window.msls) {
    window.msls = Object.getPrototypeOf(msls);
}

})(window);
// SIG // Begin signature block
// SIG // MIIaowYJKoZIhvcNAQcCoIIalDCCGpACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFCHYWDGneAhZ
// SIG // 374VyYUTCIwqdVMwoIIVgjCCBMMwggOroAMCAQICEzMA
// SIG // AAArOTJIwbLJSPMAAAAAACswDQYJKoZIhvcNAQEFBQAw
// SIG // dzELMAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0
// SIG // b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1p
// SIG // Y3Jvc29mdCBDb3Jwb3JhdGlvbjEhMB8GA1UEAxMYTWlj
// SIG // cm9zb2Z0IFRpbWUtU3RhbXAgUENBMB4XDTEyMDkwNDIx
// SIG // MTIzNFoXDTEzMTIwNDIxMTIzNFowgbMxCzAJBgNVBAYT
// SIG // AlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQH
// SIG // EwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29y
// SIG // cG9yYXRpb24xDTALBgNVBAsTBE1PUFIxJzAlBgNVBAsT
// SIG // Hm5DaXBoZXIgRFNFIEVTTjpDMEY0LTMwODYtREVGODEl
// SIG // MCMGA1UEAxMcTWljcm9zb2Z0IFRpbWUtU3RhbXAgU2Vy
// SIG // dmljZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoC
// SIG // ggEBAKa2MA4DZa5QWoZrhZ9IoR7JwO5eSQeF4HCWfL65
// SIG // X2JfBibTizm7GCKlLpKt2EuIOhqvm4OuyF45jMIyexZ4
// SIG // 7Tc4OvFi+2iCAmjs67tAirH+oSw2YmBwOWBiDvvGGDhv
// SIG // sJLWQA2Apg14izZrhoomFxj/sOtNurspE+ZcSI5wRjYm
// SIG // /jQ1qzTh99rYXOqZfTG3TR9X63zWlQ1mDB4OMhc+LNWA
// SIG // oc7r95iRAtzBX/04gPg5f11kyjdcO1FbXYVfzh4c+zS+
// SIG // X+UoVXBUnLjsfABVRlsomChWTOHxugkZloFIKjDI9zMg
// SIG // bOdpw7PUw07PMB431JhS1KkjRbKuXEFJT7RiaJMCAwEA
// SIG // AaOCAQkwggEFMB0GA1UdDgQWBBSlGDNTP5VgoUMW747G
// SIG // r9Irup5Y0DAfBgNVHSMEGDAWgBQjNPjZUkZwCu1A+3b7
// SIG // syuwwzWzDzBUBgNVHR8ETTBLMEmgR6BFhkNodHRwOi8v
// SIG // Y3JsLm1pY3Jvc29mdC5jb20vcGtpL2NybC9wcm9kdWN0
// SIG // cy9NaWNyb3NvZnRUaW1lU3RhbXBQQ0EuY3JsMFgGCCsG
// SIG // AQUFBwEBBEwwSjBIBggrBgEFBQcwAoY8aHR0cDovL3d3
// SIG // dy5taWNyb3NvZnQuY29tL3BraS9jZXJ0cy9NaWNyb3Nv
// SIG // ZnRUaW1lU3RhbXBQQ0EuY3J0MBMGA1UdJQQMMAoGCCsG
// SIG // AQUFBwMIMA0GCSqGSIb3DQEBBQUAA4IBAQB+zLB75S++
// SIG // 51a1z3PbqlLRFjnGtM361/4eZbXnSPObRogFZmomhl7+
// SIG // h1jcxmOOOID0CEZ8K3OxDr9BqsvHqpSkN/BkOeHF1fnO
// SIG // B86r5CXwaa7URuL+ZjI815fFMiH67holoF4MQiwRMzqC
// SIG // g/3tHbO+zpGkkSVxuatysJ6v5M8AYolwqbhKUIzuLyJk
// SIG // pajmTWuVLBx57KejMdqQYJCkbv6TAg0/LCQNxmomgVGD
// SIG // ShC7dWNEqmkIxgPr4s8L7VY67O9ypwoM9ADTIrivInKz
// SIG // 58ScCyiggMrj4dc5ZjDnRhcY5/qC+lkLeryoDf4c/wOL
// SIG // Y7JNEgIjTy2zhYQ74qFH6M8VMIIE7DCCA9SgAwIBAgIT
// SIG // MwAAALARrwqL0Duf3QABAAAAsDANBgkqhkiG9w0BAQUF
// SIG // ADB5MQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGlu
// SIG // Z3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMV
// SIG // TWljcm9zb2Z0IENvcnBvcmF0aW9uMSMwIQYDVQQDExpN
// SIG // aWNyb3NvZnQgQ29kZSBTaWduaW5nIFBDQTAeFw0xMzAx
// SIG // MjQyMjMzMzlaFw0xNDA0MjQyMjMzMzlaMIGDMQswCQYD
// SIG // VQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4G
// SIG // A1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0
// SIG // IENvcnBvcmF0aW9uMQ0wCwYDVQQLEwRNT1BSMR4wHAYD
// SIG // VQQDExVNaWNyb3NvZnQgQ29ycG9yYXRpb24wggEiMA0G
// SIG // CSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDor1yiIA34
// SIG // KHy8BXt/re7rdqwoUz8620B9s44z5lc/pVEVNFSlz7SL
// SIG // qT+oN+EtUO01Fk7vTXrbE3aIsCzwWVyp6+HXKXXkG4Un
// SIG // m/P4LZ5BNisLQPu+O7q5XHWTFlJLyjPFN7Dz636o9UEV
// SIG // XAhlHSE38Cy6IgsQsRCddyKFhHxPuRuQsPWj/ov0DJpO
// SIG // oPXJCiHiquMBNkf9L4JqgQP1qTXclFed+0vUDoLbOI8S
// SIG // /uPWenSIZOFixCUuKq6dGB8OHrbCryS0DlC83hyTXEmm
// SIG // ebW22875cHsoAYS4KinPv6kFBeHgD3FN/a1cI4Mp68fF
// SIG // SsjoJ4TTfsZDC5UABbFPZXHFAgMBAAGjggFgMIIBXDAT
// SIG // BgNVHSUEDDAKBggrBgEFBQcDAzAdBgNVHQ4EFgQUWXGm
// SIG // WjNN2pgHgP+EHr6H+XIyQfIwUQYDVR0RBEowSKRGMEQx
// SIG // DTALBgNVBAsTBE1PUFIxMzAxBgNVBAUTKjMxNTk1KzRm
// SIG // YWYwYjcxLWFkMzctNGFhMy1hNjcxLTc2YmMwNTIzNDRh
// SIG // ZDAfBgNVHSMEGDAWgBTLEejK0rQWWAHJNy4zFha5TJoK
// SIG // HzBWBgNVHR8ETzBNMEugSaBHhkVodHRwOi8vY3JsLm1p
// SIG // Y3Jvc29mdC5jb20vcGtpL2NybC9wcm9kdWN0cy9NaWND
// SIG // b2RTaWdQQ0FfMDgtMzEtMjAxMC5jcmwwWgYIKwYBBQUH
// SIG // AQEETjBMMEoGCCsGAQUFBzAChj5odHRwOi8vd3d3Lm1p
// SIG // Y3Jvc29mdC5jb20vcGtpL2NlcnRzL01pY0NvZFNpZ1BD
// SIG // QV8wOC0zMS0yMDEwLmNydDANBgkqhkiG9w0BAQUFAAOC
// SIG // AQEAMdduKhJXM4HVncbr+TrURE0Inu5e32pbt3nPApy8
// SIG // dmiekKGcC8N/oozxTbqVOfsN4OGb9F0kDxuNiBU6fNut
// SIG // zrPJbLo5LEV9JBFUJjANDf9H6gMH5eRmXSx7nR2pEPoc
// SIG // sHTyT2lrnqkkhNrtlqDfc6TvahqsS2Ke8XzAFH9IzU2y
// SIG // RPnwPJNtQtjofOYXoJtoaAko+QKX7xEDumdSrcHps3Om
// SIG // 0mPNSuI+5PNO/f+h4LsCEztdIN5VP6OukEAxOHUoXgSp
// SIG // Rm3m9Xp5QL0fzehF1a7iXT71dcfmZmNgzNWahIeNJDD3
// SIG // 7zTQYx2xQmdKDku/Og7vtpU6pzjkJZIIpohmgjCCBbww
// SIG // ggOkoAMCAQICCmEzJhoAAAAAADEwDQYJKoZIhvcNAQEF
// SIG // BQAwXzETMBEGCgmSJomT8ixkARkWA2NvbTEZMBcGCgmS
// SIG // JomT8ixkARkWCW1pY3Jvc29mdDEtMCsGA1UEAxMkTWlj
// SIG // cm9zb2Z0IFJvb3QgQ2VydGlmaWNhdGUgQXV0aG9yaXR5
// SIG // MB4XDTEwMDgzMTIyMTkzMloXDTIwMDgzMTIyMjkzMlow
// SIG // eTELMAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0
// SIG // b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1p
// SIG // Y3Jvc29mdCBDb3Jwb3JhdGlvbjEjMCEGA1UEAxMaTWlj
// SIG // cm9zb2Z0IENvZGUgU2lnbmluZyBQQ0EwggEiMA0GCSqG
// SIG // SIb3DQEBAQUAA4IBDwAwggEKAoIBAQCycllcGTBkvx2a
// SIG // YCAgQpl2U2w+G9ZvzMvx6mv+lxYQ4N86dIMaty+gMuz/
// SIG // 3sJCTiPVcgDbNVcKicquIEn08GisTUuNpb15S3GbRwfa
// SIG // /SXfnXWIz6pzRH/XgdvzvfI2pMlcRdyvrT3gKGiXGqel
// SIG // cnNW8ReU5P01lHKg1nZfHndFg4U4FtBzWwW6Z1KNpbJp
// SIG // L9oZC/6SdCnidi9U3RQwWfjSjWL9y8lfRjFQuScT5EAw
// SIG // z3IpECgixzdOPaAyPZDNoTgGhVxOVoIoKgUyt0vXT2Pn
// SIG // 0i1i8UU956wIAPZGoZ7RW4wmU+h6qkryRs83PDietHdc
// SIG // pReejcsRj1Y8wawJXwPTAgMBAAGjggFeMIIBWjAPBgNV
// SIG // HRMBAf8EBTADAQH/MB0GA1UdDgQWBBTLEejK0rQWWAHJ
// SIG // Ny4zFha5TJoKHzALBgNVHQ8EBAMCAYYwEgYJKwYBBAGC
// SIG // NxUBBAUCAwEAATAjBgkrBgEEAYI3FQIEFgQU/dExTtMm
// SIG // ipXhmGA7qDFvpjy82C0wGQYJKwYBBAGCNxQCBAweCgBT
// SIG // AHUAYgBDAEEwHwYDVR0jBBgwFoAUDqyCYEBWJ5flJRP8
// SIG // KuEKU5VZ5KQwUAYDVR0fBEkwRzBFoEOgQYY/aHR0cDov
// SIG // L2NybC5taWNyb3NvZnQuY29tL3BraS9jcmwvcHJvZHVj
// SIG // dHMvbWljcm9zb2Z0cm9vdGNlcnQuY3JsMFQGCCsGAQUF
// SIG // BwEBBEgwRjBEBggrBgEFBQcwAoY4aHR0cDovL3d3dy5t
// SIG // aWNyb3NvZnQuY29tL3BraS9jZXJ0cy9NaWNyb3NvZnRS
// SIG // b290Q2VydC5jcnQwDQYJKoZIhvcNAQEFBQADggIBAFk5
// SIG // Pn8mRq/rb0CxMrVq6w4vbqhJ9+tfde1MOy3XQ60L/svp
// SIG // LTGjI8x8UJiAIV2sPS9MuqKoVpzjcLu4tPh5tUly9z7q
// SIG // QX/K4QwXaculnCAt+gtQxFbNLeNK0rxw56gNogOlVuC4
// SIG // iktX8pVCnPHz7+7jhh80PLhWmvBTI4UqpIIck+KUBx3y
// SIG // 4k74jKHK6BOlkU7IG9KPcpUqcW2bGvgc8FPWZ8wi/1wd
// SIG // zaKMvSeyeWNWRKJRzfnpo1hW3ZsCRUQvX/TartSCMm78
// SIG // pJUT5Otp56miLL7IKxAOZY6Z2/Wi+hImCWU4lPF6H0q7
// SIG // 0eFW6NB4lhhcyTUWX92THUmOLb6tNEQc7hAVGgBd3TVb
// SIG // Ic6YxwnuhQ6MT20OE049fClInHLR82zKwexwo1eSV32U
// SIG // jaAbSANa98+jZwp0pTbtLS8XyOZyNxL0b7E8Z4L5UrKN
// SIG // MxZlHg6K3RDeZPRvzkbU0xfpecQEtNP7LN8fip6sCvsT
// SIG // J0Ct5PnhqX9GuwdgR2VgQE6wQuxO7bN2edgKNAltHIAx
// SIG // H+IOVN3lofvlRxCtZJj/UBYufL8FIXrilUEnacOTj5XJ
// SIG // jdibIa4NXJzwoq6GaIMMai27dmsAHZat8hZ79haDJLmI
// SIG // z2qoRzEvmtzjcT3XAH5iR9HOiMm4GPoOco3Boz2vAkBq
// SIG // /2mbluIQqBC0N1AI1sM9MIIGBzCCA++gAwIBAgIKYRZo
// SIG // NAAAAAAAHDANBgkqhkiG9w0BAQUFADBfMRMwEQYKCZIm
// SIG // iZPyLGQBGRYDY29tMRkwFwYKCZImiZPyLGQBGRYJbWlj
// SIG // cm9zb2Z0MS0wKwYDVQQDEyRNaWNyb3NvZnQgUm9vdCBD
// SIG // ZXJ0aWZpY2F0ZSBBdXRob3JpdHkwHhcNMDcwNDAzMTI1
// SIG // MzA5WhcNMjEwNDAzMTMwMzA5WjB3MQswCQYDVQQGEwJV
// SIG // UzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMH
// SIG // UmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBv
// SIG // cmF0aW9uMSEwHwYDVQQDExhNaWNyb3NvZnQgVGltZS1T
// SIG // dGFtcCBQQ0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAw
// SIG // ggEKAoIBAQCfoWyx39tIkip8ay4Z4b3i48WZUSNQrc7d
// SIG // GE4kD+7Rp9FMrXQwIBHrB9VUlRVJlBtCkq6YXDAm2gBr
// SIG // 6Hu97IkHD/cOBJjwicwfyzMkh53y9GccLPx754gd6udO
// SIG // o6HBI1PKjfpFzwnQXq/QsEIEovmmbJNn1yjcRlOwhtDl
// SIG // KEYuJ6yGT1VSDOQDLPtqkJAwbofzWTCd+n7Wl7PoIZd+
// SIG // +NIT8wi3U21StEWQn0gASkdmEScpZqiX5NMGgUqi+YSn
// SIG // EUcUCYKfhO1VeP4Bmh1QCIUAEDBG7bfeI0a7xC1Un68e
// SIG // eEExd8yb3zuDk6FhArUdDbH895uyAc4iS1T/+QXDwiAL
// SIG // AgMBAAGjggGrMIIBpzAPBgNVHRMBAf8EBTADAQH/MB0G
// SIG // A1UdDgQWBBQjNPjZUkZwCu1A+3b7syuwwzWzDzALBgNV
// SIG // HQ8EBAMCAYYwEAYJKwYBBAGCNxUBBAMCAQAwgZgGA1Ud
// SIG // IwSBkDCBjYAUDqyCYEBWJ5flJRP8KuEKU5VZ5KShY6Rh
// SIG // MF8xEzARBgoJkiaJk/IsZAEZFgNjb20xGTAXBgoJkiaJ
// SIG // k/IsZAEZFgltaWNyb3NvZnQxLTArBgNVBAMTJE1pY3Jv
// SIG // c29mdCBSb290IENlcnRpZmljYXRlIEF1dGhvcml0eYIQ
// SIG // ea0WoUqgpa1Mc1j0BxMuZTBQBgNVHR8ESTBHMEWgQ6BB
// SIG // hj9odHRwOi8vY3JsLm1pY3Jvc29mdC5jb20vcGtpL2Ny
// SIG // bC9wcm9kdWN0cy9taWNyb3NvZnRyb290Y2VydC5jcmww
// SIG // VAYIKwYBBQUHAQEESDBGMEQGCCsGAQUFBzAChjhodHRw
// SIG // Oi8vd3d3Lm1pY3Jvc29mdC5jb20vcGtpL2NlcnRzL01p
// SIG // Y3Jvc29mdFJvb3RDZXJ0LmNydDATBgNVHSUEDDAKBggr
// SIG // BgEFBQcDCDANBgkqhkiG9w0BAQUFAAOCAgEAEJeKw1wD
// SIG // RDbd6bStd9vOeVFNAbEudHFbbQwTq86+e4+4LtQSooxt
// SIG // YrhXAstOIBNQmd16QOJXu69YmhzhHQGGrLt48ovQ7DsB
// SIG // 7uK+jwoFyI1I4vBTFd1Pq5Lk541q1YDB5pTyBi+FA+mR
// SIG // KiQicPv2/OR4mS4N9wficLwYTp2OawpylbihOZxnLcVR
// SIG // DupiXD8WmIsgP+IHGjL5zDFKdjE9K3ILyOpwPf+FChPf
// SIG // wgphjvDXuBfrTot/xTUrXqO/67x9C0J71FNyIe4wyrt4
// SIG // ZVxbARcKFA7S2hSY9Ty5ZlizLS/n+YWGzFFW6J1wlGys
// SIG // OUzU9nm/qhh6YinvopspNAZ3GmLJPR5tH4LwC8csu89D
// SIG // s+X57H2146SodDW4TsVxIxImdgs8UoxxWkZDFLyzs7BN
// SIG // Z8ifQv+AeSGAnhUwZuhCEl4ayJ4iIdBD6Svpu/RIzCzU
// SIG // 2DKATCYqSCRfWupW76bemZ3KOm+9gSd0BhHudiG/m4LB
// SIG // J1S2sWo9iaF2YbRuoROmv6pH8BJv/YoybLL+31HIjCPJ
// SIG // Zr2dHYcSZAI9La9Zj7jkIeW1sMpjtHhUBdRBLlCslLCl
// SIG // eKuzoJZ1GtmShxN1Ii8yqAhuoFuMJb+g74TKIdbrHk/J
// SIG // mu5J4PcBZW+JC33Iacjmbuqnl84xKf8OxVtc2E0bodj6
// SIG // L54/LlUWa8kTo/0xggSNMIIEiQIBATCBkDB5MQswCQYD
// SIG // VQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4G
// SIG // A1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0
// SIG // IENvcnBvcmF0aW9uMSMwIQYDVQQDExpNaWNyb3NvZnQg
// SIG // Q29kZSBTaWduaW5nIFBDQQITMwAAALARrwqL0Duf3QAB
// SIG // AAAAsDAJBgUrDgMCGgUAoIGmMBkGCSqGSIb3DQEJAzEM
// SIG // BgorBgEEAYI3AgEEMBwGCisGAQQBgjcCAQsxDjAMBgor
// SIG // BgEEAYI3AgEVMCMGCSqGSIb3DQEJBDEWBBRJpbo/CEak
// SIG // F6WXNPMXFpP40h8ZHjBGBgorBgEEAYI3AgEMMTgwNqAc
// SIG // gBoAbQBzAGwAcwAtADIALgAwAC4AMAAuAGoAc6EWgBRo
// SIG // dHRwOi8vbWljcm9zb2Z0LmNvbTANBgkqhkiG9w0BAQEF
// SIG // AASCAQDFuCcuef+jVohWzNdwd9GnoZz9GSnSImSm4MBL
// SIG // k+Hkn7ZqMcm7rTpNcaecX9+rdRoYB4zrUpjfh1Ve7IOS
// SIG // Nxeo1QEM8vni5ktykZP0Dqrg4HBvTHF0jp2A3g1h0a8z
// SIG // bFOtqHIVL/uICzH8qomvqOc5xFBY1f4kc3EGW+UkxQP+
// SIG // wVYfS4Ain1eIvLl5VEJ//2IyiHNzGF+NpjzV/3cBItaK
// SIG // jxJjO+D9wf7M4r8mjpv/8qRtCBuecgz8n+dmpItXWbhG
// SIG // j5hy25doxqk/MhmQs/LOs1qn37LkQ9rF5Qfo98bREaUo
// SIG // E9bfJVtFMthn9QXWQiuv3eNND71Qtfd0/xZaVRVMoYIC
// SIG // KDCCAiQGCSqGSIb3DQEJBjGCAhUwggIRAgEBMIGOMHcx
// SIG // CzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9u
// SIG // MRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNy
// SIG // b3NvZnQgQ29ycG9yYXRpb24xITAfBgNVBAMTGE1pY3Jv
// SIG // c29mdCBUaW1lLVN0YW1wIFBDQQITMwAAACs5MkjBsslI
// SIG // 8wAAAAAAKzAJBgUrDgMCGgUAoF0wGAYJKoZIhvcNAQkD
// SIG // MQsGCSqGSIb3DQEHATAcBgkqhkiG9w0BCQUxDxcNMTMw
// SIG // ODI3MTM0NjA0WjAjBgkqhkiG9w0BCQQxFgQUSkb9oA1y
// SIG // BaIxPYRAyzvMvTPK7SwwDQYJKoZIhvcNAQEFBQAEggEA
// SIG // N/lsizj+MDNaVTBGYP/WI10C5+cyZJ2dGcId2n+NhGNS
// SIG // WeSd/C/pANr0pcmRKloyzPBktRC8OCxhn/WVjcvcm/vr
// SIG // NYmE2pWuq4yw67cTQxmRoZjXc9l8qQCMPtdfLdbBZhOd
// SIG // tfoaMCxJBuKPrZ7GWIBYfoiPczeTeV3XIRxlgvq/XorH
// SIG // xHICy4JotyWCb9t4zUatCNEx12wqOKrWImbeeqovCZr4
// SIG // rEhq8Mdcimt8GYyRY9kDoumcY2hzgQa25qQ9keaSkto+
// SIG // HVqnTndbAOxy9rkOkAqZIhPb469SWjWm0VNUahXsuyvC
// SIG // uwSA8HSPaFm0fFsVmtWOdQoyxF+0GWimFw==
// SIG // End signature block
