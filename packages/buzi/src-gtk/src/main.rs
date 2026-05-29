use adw::prelude::*;
use gtk::{gdk, gio, pango};
use serde_json::Value;
use webkit::prelude::*;

const APP_ID: &str = "ai.opencode.buzi.Gtk";
const DEV_URL: &str = "http://localhost:4455";

fn main() {
    let app = adw::Application::builder()
        .application_id(APP_ID)
        .flags(gio::ApplicationFlags::HANDLES_OPEN)
        .build();

    app.connect_activate(build_window);
    app.run();
}

fn build_window(app: &adw::Application) {
    install_css();

    let window = adw::ApplicationWindow::builder()
        .application(app)
        .title("Buzi")
        .default_width(1280)
        .default_height(840)
        .width_request(360)
        .height_request(640)
        .build();

    let layout = gtk::Box::new(gtk::Orientation::Vertical, 0);
    let header = adw::HeaderBar::new();
    let title = gtk::Label::builder()
        .label("No project selected")
        .ellipsize(pango::EllipsizeMode::Middle)
        .max_width_chars(72)
        .build();
    title.add_css_class("header-title");

    let subtitle = gtk::Label::builder()
        .label("New session")
        .ellipsize(pango::EllipsizeMode::End)
        .max_width_chars(72)
        .build();
    subtitle.add_css_class("header-subtitle");

    let title_box = gtk::Box::new(gtk::Orientation::Vertical, 0);
    title_box.set_halign(gtk::Align::Center);
    title_box.set_spacing(2);
    title_box.add_css_class("header-title-box");
    title_box.append(&title);
    title_box.append(&subtitle);
    header.set_title_widget(Some(&title_box));

    let status_dot = gtk::Label::new(Some("●"));
    status_dot.set_halign(gtk::Align::End);
    status_dot.set_valign(gtk::Align::End);
    status_dot.add_css_class("status-dot");
    status_dot.add_css_class("connecting");

    let status_icon = gtk::Image::from_icon_name("network-server-symbolic");
    let status_overlay = gtk::Overlay::new();
    status_overlay.set_child(Some(&status_icon));
    status_overlay.add_overlay(&status_dot);

    let status = gtk::Button::builder()
        .tooltip_text("Server status")
        .sensitive(false)
        .build();
    status.set_child(Some(&status_overlay));
    status.add_css_class("flat");
    status.add_css_class("server-status");

    let manager = webkit::UserContentManager::new();
    manager.register_script_message_handler("buziHeader", None);
    manager.connect_script_message_received(Some("buziHeader"), {
        let title = title.clone();
        let subtitle = subtitle.clone();
        let status_dot = status_dot.clone();
        move |_, value| {
            update_header(&title, &subtitle, &status_dot, value);
        }
    });

    let webview = webkit::WebView::builder()
        .user_content_manager(&manager)
        .build();
    webview.set_hexpand(true);
    webview.set_vexpand(true);
    webview.load_uri(DEV_URL);

    header.pack_start(&header_button(
        "sidebar-show-symbolic",
        "Toggle left sidebar",
        {
            let webview = webview.clone();
            move || dispatch_web_event(&webview, "buzi:toggle-sidebar")
        },
    ));
    header.pack_end(&header_button(
        "sidebar-show-right-symbolic",
        "Toggle right sidebar",
        {
            let webview = webview.clone();
            move || dispatch_web_event(&webview, "buzi:toggle-inspector")
        },
    ));
    header.pack_end(&placeholder_button(
        "view-more-symbolic",
        "Menu placeholder",
    ));
    header.pack_end(&status);

    layout.append(&header);
    layout.append(&webview);
    window.set_content(Some(&layout));
    window.present();
}

fn header_button(icon_name: &str, tooltip: &str, on_click: impl Fn() + 'static) -> gtk::Button {
    let button = gtk::Button::builder()
        .icon_name(icon_name)
        .tooltip_text(tooltip)
        .build();
    button.connect_clicked(move |_| on_click());
    button
}

fn placeholder_button(icon_name: &str, tooltip: &str) -> gtk::Button {
    let button = gtk::Button::builder()
        .icon_name(icon_name)
        .tooltip_text(tooltip)
        .sensitive(false)
        .build();
    button
}

fn dispatch_web_event(webview: &webkit::WebView, event_name: &str) {
    webview.evaluate_javascript(
        &format!("window.dispatchEvent(new CustomEvent('{}'))", event_name),
        None,
        None,
        None::<&gio::Cancellable>,
        |_| {},
    );
}

fn update_header(
    title: &gtk::Label,
    subtitle: &gtk::Label,
    status_dot: &gtk::Label,
    value: &javascriptcore6::Value,
) {
    let Some(payload) = value
        .to_json(0)
        .and_then(|json| serde_json::from_str::<Value>(&json).ok())
    else {
        return;
    };

    title.set_label(
        payload["projectPath"]
            .as_str()
            .unwrap_or("No project selected"),
    );
    subtitle.set_label(payload["title"].as_str().unwrap_or("New session"));

    status_dot.remove_css_class("connected");
    status_dot.remove_css_class("connecting");
    status_dot.remove_css_class("error");
    status_dot.add_css_class(payload["serverState"].as_str().unwrap_or("connecting"));
}

fn install_css() {
    let provider = gtk::CssProvider::new();
    provider.load_from_data(
        "
        .header-title {
          font-weight: 600;
        }

        .header-title-box {
          margin-top: 2px;
          margin-bottom: 2px;
        }

        .header-subtitle {
          font-size: 11px;
          opacity: 0.68;
        }

        .server-status {
          padding-left: 8px;
          padding-right: 8px;
        }

        .status-dot {
          font-size: 9px;
          margin-right: -4px;
          margin-bottom: -4px;
          text-shadow: 0 0 0 2px @window_bg_color;
        }

        .status-dot.connected {
          color: #22c55e;
        }

        .status-dot.connecting {
          color: #f59e0b;
        }

        .status-dot.error {
          color: #ef4444;
        }
        ",
    );

    if let Some(display) = gdk::Display::default() {
        gtk::style_context_add_provider_for_display(
            &display,
            &provider,
            gtk::STYLE_PROVIDER_PRIORITY_APPLICATION,
        );
    }
}
